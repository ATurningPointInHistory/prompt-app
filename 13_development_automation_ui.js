/* ============================================================
   FILE: 13_development_automation_ui.js
   IDE-190 Development Automation
   Release: 1.10.0 / Module: UI 1.1.0
   Post-Release Compatible Feature: Launcher / Tabs / Usage Guide
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-190 UI blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("ui");
  const UI_ID = "ide190-development-automation-console";
  const VALID_TABS = ["home", "guide", "reflection", "safety"];
  const viewState = {
    minimized: false,
    busy: false,
    activeTab: "home",
    lastReflectionPackageId: null,
    lastMessage: ""
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function getGuide() {
    return typeof namespace.getDevelopmentAutomationGuide === "function"
      ? namespace.getDevelopmentAutomationGuide()
      : { quickStart: [], workflow: [], reflection: { steps: [], notes: [] }, safety: { allowed: [], prohibited: [] }, fallbackCommands: [], troubleshooting: [] };
  }

  function ensureStyle() {
    if (!global.document || global.document.getElementById(UI_ID + "-style")) return;
    const style = global.document.createElement("style");
    style.id = UI_ID + "-style";
    style.textContent = `
#${UI_ID}{position:fixed;inset:0;z-index:2147483100;background:rgba(0,0,0,.72);display:flex;align-items:stretch;justify-content:center;padding:10px;font-family:system-ui,-apple-system,sans-serif;color:#eef2f7}
#${UI_ID} .ide190-panel{width:min(980px,100%);height:100%;background:#111827;border:1px solid #374151;border-radius:14px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.45)}
#${UI_ID} .ide190-header{display:flex;gap:8px;align-items:center;padding:11px 12px;background:#0b1220;border-bottom:1px solid #374151}
#${UI_ID} .ide190-title{font-weight:700;flex:1;min-width:0}#${UI_ID} .ide190-sub{font-size:12px;color:#93c5fd}
#${UI_ID} .ide190-tabs{display:flex;gap:6px;overflow:auto;padding:8px 10px;background:#0d1626;border-bottom:1px solid #374151}
#${UI_ID} .ide190-tab{white-space:nowrap;background:#172033;border-color:#334155;padding:8px 12px}#${UI_ID} .ide190-tab.active{background:#2563eb;border-color:#60a5fa}
#${UI_ID} .ide190-body{overflow:auto;padding:12px;display:grid;gap:12px}#${UI_ID} .ide190-view{display:none;gap:12px}#${UI_ID} .ide190-view.active{display:grid}
#${UI_ID} .ide190-section{border:1px solid #374151;border-radius:10px;padding:11px;background:#182131}
#${UI_ID} .ide190-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}#${UI_ID} .ide190-card{border:1px solid #3f4a5d;border-radius:8px;padding:9px;background:#111827;min-width:0}
#${UI_ID} .ide190-label{font-size:11px;color:#94a3b8}#${UI_ID} .ide190-value{font-size:13px;word-break:break-word;margin-top:3px}
#${UI_ID} .ide190-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}#${UI_ID} button,#${UI_ID} textarea,#${UI_ID} input{font:inherit}
#${UI_ID} button{border:1px solid #4b5563;background:#263247;color:#fff;border-radius:8px;padding:9px 11px;cursor:pointer}#${UI_ID} button.primary{background:#2563eb;border-color:#3b82f6}#${UI_ID} button.success{background:#047857;border-color:#10b981}#${UI_ID} button:disabled{opacity:.45;cursor:not-allowed}
#${UI_ID} textarea,#${UI_ID} input{width:100%;box-sizing:border-box;background:#080d16;color:#eef2f7;border:1px solid #4b5563;border-radius:8px;padding:9px}#${UI_ID} textarea{min-height:92px;resize:vertical}
#${UI_ID} pre{white-space:pre-wrap;word-break:break-word;background:#080d16;border:1px solid #303a4b;border-radius:8px;padding:9px;max-height:260px;overflow:auto}
#${UI_ID} .ide190-safe{color:#6ee7b7}#${UI_ID} .ide190-warn{color:#fbbf24}#${UI_ID} .ide190-error{color:#fca5a5}#${UI_ID} .ide190-muted{color:#aab4c4;font-size:12px}
#${UI_ID} .ide190-step{display:grid;grid-template-columns:34px 1fr;gap:9px;align-items:start;padding:9px 0;border-bottom:1px solid #2f3a4c}#${UI_ID} .ide190-step:last-child{border-bottom:0}
#${UI_ID} .ide190-step-no{width:30px;height:30px;border-radius:999px;background:#1d4ed8;display:flex;align-items:center;justify-content:center;font-weight:700}#${UI_ID} .ide190-stage{font-size:11px;color:#93c5fd;margin-bottom:2px}
#${UI_ID} .ide190-list{margin:7px 0 0;padding-left:20px}#${UI_ID} .ide190-list li{margin:5px 0;line-height:1.5}#${UI_ID} code{background:#080d16;border:1px solid #303a4b;border-radius:6px;padding:2px 5px;word-break:break-all}
#${UI_ID} .ide190-footer{padding:9px 12px;background:#0b1220;border-top:1px solid #374151;display:flex;gap:8px;flex-wrap:wrap}
#${UI_ID}.ide190-minimized{inset:auto 6px 6px auto;width:min(430px,calc(100vw - 12px));height:auto;background:transparent;padding:0;display:block;pointer-events:none}#${UI_ID}.ide190-minimized .ide190-panel{width:100%;height:auto;pointer-events:auto;border-radius:10px}#${UI_ID}.ide190-minimized .ide190-tabs,#${UI_ID}.ide190-minimized .ide190-body,#${UI_ID}.ide190-minimized .ide190-footer{display:none}
@media(max-width:700px){#${UI_ID}{padding:0}#${UI_ID} .ide190-panel{border-radius:0;border:0}#${UI_ID} .ide190-grid{grid-template-columns:1fr}#${UI_ID} .ide190-body{padding:9px}#${UI_ID}.ide190-minimized{width:calc(100vw - 12px)}}
`;
    global.document.head.appendChild(style);
  }

  function root() { return global.document && global.document.getElementById(UI_ID); }

  function getDevelopmentAutomationUIProjection() {
    const status = typeof namespace.getStatus === "function" ? namespace.getStatus() : {};
    const platform = typeof namespace.getPlatformProfile === "function" ? namespace.getPlatformProfile() : {};
    const safety = typeof namespace.getSafetyStatus === "function" ? namespace.getSafetyStatus() : {};
    const reflection = typeof namespace.getAutomationReflectionStatus === "function" ? namespace.getAutomationReflectionStatus() : {};
    const guide = typeof namespace.getDevelopmentAutomationGuideStatus === "function" ? namespace.getDevelopmentAutomationGuideStatus() : {};
    return {
      componentId: "IDE-190",
      version: VERSION_MANIFEST.release.version,
      phase: VERSION_MANIFEST.implementation.phase,
      phaseName: VERSION_MANIFEST.implementation.phaseName,
      architectureStatus: VERSION_MANIFEST.release.architectureStatus,
      platform: internal.clone(platform),
      repositoryTrustStatus: status.repositoryMutationTrust && status.repositoryMutationTrust.status || "Trusted",
      mutationLockActive: Boolean(status.mutationTrialLock && status.mutationTrialLock.active),
      safety: internal.clone(safety),
      reflection: internal.clone(reflection),
      guide: internal.clone(guide),
      uiCapabilities: {
        statusRead: true,
        receiptRead: true,
        guideRead: true,
        tabNavigation: true,
        reflectionPreparation: true,
        explicitDownload: true,
        openExistingManualPasteManager: typeof global.openZipPasteManager === "function",
        openExistingDiffManager: typeof global.openZipDiffManager === "function",
        approvalAction: false,
        dispatchAction: false,
        mutationAction: false,
        repositoryWriteAction: false,
        githubWriteAction: false,
        automaticReflectionAction: false
      },
      permissionChangesFromDisplayMode: false
    };
  }

  function statusHtml() {
    const p = getDevelopmentAutomationUIProjection();
    const cards = [
      ["Version / Phase", p.version + " / Phase " + p.phase],
      ["Platform", (p.platform.deviceClass || "Unknown") + " / " + (p.platform.profileId || "")],
      ["Repository Trust", p.repositoryTrustStatus],
      ["Mutation Lock", String(p.mutationLockActive)],
      ["Persistent Commit", "PROHIBITED"],
      ["GitHub Automatic Reflection", "PROHIBITED"]
    ];
    return cards.map(function card(item) {
      return '<div class="ide190-card"><div class="ide190-label">' + escapeHtml(item[0]) + '</div><div class="ide190-value">' + escapeHtml(item[1]) + '</div></div>';
    }).join("");
  }

  function quickStartHtml() {
    return getGuide().quickStart.map(function item(step) {
      return '<div class="ide190-step"><div class="ide190-step-no">' + escapeHtml(step.step) + '</div><div><strong>' + escapeHtml(step.title) + '</strong><div class="ide190-muted">' + escapeHtml(step.description) + '</div></div></div>';
    }).join("");
  }

  function workflowHtml() {
    return getGuide().workflow.map(function item(step) {
      return '<div class="ide190-step"><div class="ide190-step-no">' + escapeHtml(step.step) + '</div><div><div class="ide190-stage">' + escapeHtml(step.stage) + '</div><strong>' + escapeHtml(step.title) + '</strong><div class="ide190-muted">' + escapeHtml(step.description) + '</div></div></div>';
    }).join("");
  }

  function listHtml(items) {
    return '<ul class="ide190-list">' + (items || []).map(function item(value) { return '<li>' + escapeHtml(value) + '</li>'; }).join("") + '</ul>';
  }

  function commandsHtml() {
    return getGuide().fallbackCommands.map(function item(entry) {
      return '<div class="ide190-card"><div class="ide190-label">' + escapeHtml(entry.label) + '</div><div class="ide190-value"><code>' + escapeHtml(entry.command) + '</code></div></div>';
    }).join("");
  }

  function troubleshootingHtml() {
    return getGuide().troubleshooting.map(function item(entry) {
      return '<div class="ide190-card"><div class="ide190-label">' + escapeHtml(entry.symptom) + '</div><div class="ide190-value">' + escapeHtml(entry.action) + '</div></div>';
    }).join("");
  }

  function render() {
    const container = root();
    if (!container) return;
    const status = container.querySelector("[data-role=status-grid]");
    if (status) status.innerHTML = statusHtml();
    const quick = container.querySelector("[data-role=quick-start]");
    if (quick) quick.innerHTML = quickStartHtml();
    const workflow = container.querySelector("[data-role=workflow]");
    if (workflow) workflow.innerHTML = workflowHtml();
    const commands = container.querySelector("[data-role=fallback-commands]");
    if (commands) commands.innerHTML = commandsHtml();
    const trouble = container.querySelector("[data-role=troubleshooting]");
    if (trouble) trouble.innerHTML = troubleshootingHtml();
    const packageId = container.querySelector("[data-role=package-id]");
    if (packageId) packageId.textContent = viewState.lastReflectionPackageId || "未準備";
    const message = container.querySelector("[data-role=message]");
    if (message) message.textContent = viewState.lastMessage || "UIは権限を増やしません。実行Controlは追加していません。ReflectionはX1手動準備のみです。";
    container.classList.toggle("ide190-minimized", viewState.minimized === true);
    container.querySelectorAll("[data-view]").forEach(function view(node) { node.classList.toggle("active", node.dataset.view === viewState.activeTab); });
    container.querySelectorAll("button[data-tab]").forEach(function tab(button) { button.classList.toggle("active", button.dataset.tab === viewState.activeTab); });
    container.querySelectorAll("button[data-action]").forEach(function disable(button) { button.disabled = viewState.busy; });
  }

  function ensureDevelopmentAutomationConsole() {
    if (!global.document) return internal.buildResult(false, "IDE190_UI_DOCUMENT_UNAVAILABLE", "Blocked", null);
    ensureStyle();
    let container = root();
    if (!container) {
      const guide = getGuide();
      container = global.document.createElement("div");
      container.id = UI_ID;
      container.innerHTML = `
<div class="ide190-panel">
  <div class="ide190-header"><div class="ide190-title">IDE-190 Development Automation</div><div class="ide190-sub">v${escapeHtml(VERSION_MANIFEST.release.version)} Safe UI / Guide</div><button data-action="minimize">最小化</button><button data-action="close">閉じる</button></div>
  <div class="ide190-tabs"><button class="ide190-tab" data-tab="home">ホーム</button><button class="ide190-tab" data-tab="guide">使い方</button><button class="ide190-tab" data-tab="reflection">Reflection</button><button class="ide190-tab" data-tab="safety">安全仕様</button></div>
  <div class="ide190-body">
    <div class="ide190-view" data-view="home">
      <section class="ide190-section"><div class="ide190-row"><strong>Safety / Status</strong><button data-action="refresh">更新</button></div><div class="ide190-grid" data-role="status-grid"></div></section>
      <section class="ide190-section"><strong>最初の3ステップ</strong><div data-role="quick-start"></div></section>
      <section class="ide190-section"><strong>覚えておくこと</strong><p class="ide190-safe">この画面は実行権限を増やしません。Approval / Dispatch / Mutationの実行ボタンはありません。</p><div class="ide190-grid" data-role="fallback-commands"></div></section>
    </div>
    <div class="ide190-view" data-view="guide">
      <section class="ide190-section"><strong>${escapeHtml(guide.title || "使い方")}</strong><p class="ide190-muted">${escapeHtml(guide.purpose || "")}</p><div data-role="workflow"></div></section>
      <section class="ide190-section"><strong>困ったとき</strong><div class="ide190-grid" data-role="troubleshooting"></div></section>
    </div>
    <div class="ide190-view" data-view="reflection">
      <section class="ide190-section"><strong>Reflection Package（X1 / 手動反映準備）</strong><p class="ide190-muted">対象ファイルは推測しません。1行1ファイルで明示してください。準備だけではDownloadやGitHub反映は行いません。</p><textarea data-role="files" placeholder="例:\n13_development_automation_ui.js\n13_development_automation_guide.js"></textarea><div style="height:7px"></div><input data-role="receipt" placeholder="Automation Receipt ID（任意）"><div class="ide190-row" style="margin-top:8px"><button class="primary" data-action="prepare">Reflection Package準備</button><button class="success" data-action="download">ZIPを手動保存</button></div><p class="ide190-muted">Package: <span data-role="package-id">未準備</span></p><pre data-role="reflection-result">まだ準備されていません。</pre></section>
      <section class="ide190-section"><strong>Reflection手順</strong>${listHtml(guide.reflection && guide.reflection.steps)}<p class="ide190-warn">${escapeHtml((guide.reflection && guide.reflection.notes || []).join(" / "))}</p></section>
      <section class="ide190-section"><strong>既存の手動反映ツール</strong><p class="ide190-muted">IDE-190は自動適用しません。ユーザー操作で既存UIを開くだけです。</p><div class="ide190-row"><button data-action="paste-manager">ZIP貼付管理を開く</button><button data-action="diff-manager">Diff ZIP管理を開く</button></div></section>
    </div>
    <div class="ide190-view" data-view="safety">
      <section class="ide190-section"><strong>許可される範囲</strong>${listHtml(guide.safety && guide.safety.allowed)}</section>
      <section class="ide190-section"><strong>禁止される範囲</strong><div class="ide190-error">${listHtml(guide.safety && guide.safety.prohibited)}</div></section>
      <section class="ide190-section"><div class="ide190-safe">Persistent Commit / GitHub自動反映 / Approval bypass / Repository直接変更は、このUIから実行できません。</div><div class="ide190-muted">Android / PC / 表示モードでSensitive Permissionは増えません。</div></section>
    </div>
  </div>
  <div class="ide190-footer"><button data-action="restore">表示を戻す</button><span class="ide190-muted" data-role="message"></span></div>
</div>`;
      global.document.body.appendChild(container);
      container.addEventListener("click", function onClick(event) {
        const tab = event.target && event.target.closest && event.target.closest("button[data-tab]");
        if (tab && VALID_TABS.indexOf(tab.dataset.tab) >= 0) { viewState.activeTab = tab.dataset.tab; render(); return; }
        const button = event.target && event.target.closest && event.target.closest("button[data-action]");
        if (!button) return;
        const action = button.dataset.action;
        if (action === "close") return closeDevelopmentAutomationConsole();
        if (action === "minimize") { viewState.minimized = true; render(); return; }
        if (action === "restore") { viewState.minimized = false; render(); return; }
        if (action === "refresh") { render(); return; }
        if (action === "paste-manager" && typeof global.openZipPasteManager === "function") return global.openZipPasteManager();
        if (action === "diff-manager" && typeof global.openZipDiffManager === "function") return global.openZipDiffManager();
        if (action === "prepare") return prepareFromUI();
        if (action === "download") return downloadFromUI();
      });
    }
    render();
    return internal.buildResult(true, "IDE190_UI_READY", "Ready", getDevelopmentAutomationUIProjection());
  }

  async function prepareFromUI() {
    const container = root();
    if (!container || viewState.busy) return;
    const raw = container.querySelector("[data-role=files]").value || "";
    const receipt = container.querySelector("[data-role=receipt]").value || "";
    const filePaths = raw.split(/\r?\n|,/).map(function trim(value) { return value.trim(); }).filter(Boolean);
    viewState.busy = true; viewState.lastMessage = "Reflection Packageを検証中..."; render();
    try {
      const result = await namespace.prepareAutomationReflectionPackage({ filePaths: filePaths, automationReceiptId: receipt || null, actorRole: "Project Owner" });
      const output = container.querySelector("[data-role=reflection-result]");
      if (result.ok && result.data && result.data.package) {
        viewState.lastReflectionPackageId = result.data.package.reflectionPackageId;
        viewState.lastMessage = "準備完了。まだDownload/外部反映は行っていません。";
        if (output) output.textContent = JSON.stringify(result.data.package, null, 2);
      } else {
        viewState.lastMessage = result.code || "Reflection Package準備に失敗しました。";
        if (output) output.textContent = JSON.stringify(result, null, 2);
      }
    } catch (error) { viewState.lastMessage = error && error.message || String(error); }
    finally { viewState.busy = false; render(); }
  }

  async function downloadFromUI() {
    if (!viewState.lastReflectionPackageId || viewState.busy) { viewState.lastMessage = "先にReflection Packageを準備してください。"; render(); return; }
    viewState.busy = true; viewState.lastMessage = "ユーザー操作としてZIPを生成しています..."; render();
    try {
      const result = await namespace.downloadAutomationReflectionPackage(viewState.lastReflectionPackageId);
      viewState.lastMessage = result.ok ? "ZIP保存を開始しました。GitHub writeは行っていません。" : (result.code || "ZIP生成に失敗しました。");
    } catch (error) { viewState.lastMessage = error && error.message || String(error); }
    finally { viewState.busy = false; render(); }
  }

  function setDevelopmentAutomationConsoleTab(tabName) {
    const tab = String(tabName || "home").trim().toLowerCase();
    if (VALID_TABS.indexOf(tab) < 0) return internal.buildResult(false, "IDE190_UI_TAB_INVALID", "Blocked", { requestedTab: tabName, validTabs: VALID_TABS.slice() });
    viewState.activeTab = tab;
    render();
    return internal.buildResult(true, "IDE190_UI_TAB_SELECTED", "Ready", { activeTab: tab });
  }

  function openDevelopmentAutomationConsole(tabName) {
    const ready = ensureDevelopmentAutomationConsole();
    if (tabName) setDevelopmentAutomationConsoleTab(tabName);
    const container = root();
    if (container) { container.style.display = "flex"; viewState.minimized = false; render(); }
    return ready;
  }

  function openDevelopmentAutomationGuide() {
    return openDevelopmentAutomationConsole("guide");
  }

  function closeDevelopmentAutomationConsole() {
    const container = root();
    if (container) container.style.display = "none";
    return internal.buildResult(true, "IDE190_UI_CLOSED", "Ready", null);
  }

  function getDevelopmentAutomationUIStatus() {
    return {
      status: "Ready",
      uiId: UI_ID,
      opened: Boolean(root() && root().style.display !== "none"),
      minimized: viewState.minimized,
      activeTab: viewState.activeTab,
      tabs: VALID_TABS.slice(),
      busy: viewState.busy,
      lastReflectionPackageId: viewState.lastReflectionPackageId,
      guideAvailable: typeof namespace.getDevelopmentAutomationGuide === "function",
      executionControlsExposed: false,
      permissionChangesFromDisplayMode: false
    };
  }

  function initializeDevelopmentAutomationUI() {
    namespace.modules.ui.status = global.document ? "Ready" : "Headless Ready";
    return internal.buildResult(true, "IDE190_UI_INITIALIZED", namespace.modules.ui.status, getDevelopmentAutomationUIProjection());
  }

  Object.assign(namespace.api, {
    initializeDevelopmentAutomationUI: initializeDevelopmentAutomationUI,
    ensureDevelopmentAutomationConsole: ensureDevelopmentAutomationConsole,
    openDevelopmentAutomationConsole: openDevelopmentAutomationConsole,
    openDevelopmentAutomationGuide: openDevelopmentAutomationGuide,
    closeDevelopmentAutomationConsole: closeDevelopmentAutomationConsole,
    setDevelopmentAutomationConsoleTab: setDevelopmentAutomationConsoleTab,
    getDevelopmentAutomationUIStatus: getDevelopmentAutomationUIStatus,
    getDevelopmentAutomationUIProjection: getDevelopmentAutomationUIProjection
  });
  Object.assign(namespace, namespace.api);
  global.openDevelopmentAutomationConsole = openDevelopmentAutomationConsole;
  global.openDevelopmentAutomationGuide = openDevelopmentAutomationGuide;
  global.closeDevelopmentAutomationConsole = closeDevelopmentAutomationConsole;

  namespace.modules.ui = {
    id: "IDE-190-SAFE-AUTOMATION-UI",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 10,
    postReleaseFeature: true,
    responsive: true,
    guideIntegrated: true,
    tabNavigation: true,
    permissionIndependent: true,
    executionControlsExposed: false,
    approvalAction: false,
    dispatchAction: false,
    mutationAction: false,
    githubWriteAction: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
