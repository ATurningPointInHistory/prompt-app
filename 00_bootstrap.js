/* ===============================
   FILE: 00_bootstrap.js
   Bootstrap / Shared Core
=============================== */
/* ===============================
   Manager Panel Core
=============================== */

let floatPanelHistory = [];

function closeAllManagers() {

  [
    "template-manager",
    "danger-manager",
    "pattern-manager",
    "ai-preset-manager"
  ].forEach(id => {

    const el =
      get(id);

    if (el) {
      el.style.display =
        "none";
    }

  });
}

function updatePanelButtonStates() {
  const templateBtn = get("templateBtn");
  const dangerBtn = get("dangerBtn");
  const patternBtn = get("patternBtn");
  const aiPresetBtn = get("aiPresetBtn");
  if (templateBtn) {
    templateBtn.classList.toggle(
      "active-panel",
      get("template-manager").style.display !== "none"
    );
  }
  if (dangerBtn) {
    dangerBtn.classList.toggle(
      "active-panel",
      get("danger-manager").style.display !== "none"
    );
  }
  if (patternBtn) {
    patternBtn.classList.toggle(
      "active-panel",
      get("pattern-manager").style.display !== "none"
    );
  }
  if (aiPresetBtn) {
    aiPresetBtn.classList.toggle(
      "active-panel",
    get("ai-preset-manager").style.display !== "none"
    );
  }
}

/* ===============================
   App Navigation / Tools Menu
=============================== */
function switchAppPage(mode) {
  closeFloatPanel();
  get("appPage").style.display =
    mode === "app" ? "block" : "none";
  get("repairPage").style.display =
    mode === "repair" ? "block" : "none";
  get("appPageTab").classList.toggle(
    "active",
    mode === "app"
  );
  get("repairPageTab").classList.toggle(
    "active",
    mode === "repair"
  );
  if (mode === "repair") {
    resetRepairEditorView();
  }
}

function isRepairMode() {
  return get("repairPage").style.display !== "none";
}

function buildNormalToolsHtml() {
  return `
<button class="float-list-btn" onclick="toggleTemplateManager()">
🧩 テンプレ管理
</button>

<button class="float-list-btn" onclick="toggleDangerManager()">
⚠ 危険ワード管理
</button>

<button class="float-list-btn" onclick="togglePatternManager()">
🚫 NGパターン管理
</button>

<button class="float-list-btn" onclick="toggleAiPresetManager()">
🤖 AIプリセット管理
</button>

<hr>

<button class="float-list-btn"
onclick="saveProjectPackage()">
📦 プロジェクト保存
</button>

<button class="float-list-btn" onclick="backupProgram()">
💾 結合HTML出力
</button>

<button class="float-list-btn" onclick="showBackupHistory()">
📚 バックアップ履歴
</button>

<button class="float-list-btn" onclick="saveProgramHtml()">
💾 本体HTML保存
</button>

<button class="float-list-btn" onclick="restoreProgramBackup()">
♻ フル復元
</button>

<hr>

<button class="float-list-btn" onclick="reviewPrompt()">
🛠 Promptレビュー
</button>

<button class="float-list-btn" onclick="testPromptObject()">
🧩 内部JSONテスト
</button>

<button class="float-list-btn" onclick="testJsonFormat()">
🧪 JSONテスト
</button>

<button class="float-list-btn" onclick="formatJsonOutput()">
📦 JSON整形
</button>

<button class="float-list-btn" onclick="recheckOutput()">
🔍 再チェック
</button>

<button class="float-list-btn" onclick="diagnoseHtml()">
🩺 HTML診断
</button>

<button class="float-list-btn" onclick="compareBackupSummary()">
📊 バックアップ差分確認
</button>

<button class="float-list-btn"
  onclick="previewRepairHtml()">
🎨 色分けプレビュー
</button>

<button class="float-list-btn" onclick="analyzeProjectJsDependency()">
  🧭 全JS依存診断
</button>

<button class="float-list-btn" onclick="showHtmlHealth()">
💚 HTML HEALTH
</button>

<hr>

<button class="float-list-btn" onclick="exportTemplates()">
📤 テンプレ保存
</button>

<button class="float-list-btn" onclick="importTemplates()">
📥 テンプレ復元
</button>

<button class="float-list-btn" onclick="exportAiPresets()">
🤖 AI設定バックアップ
</button>

<button class="float-list-btn" onclick="importAiPresets()">
🤖 AI設定復元
</button>

<hr>

<button class="float-list-btn" onclick="renderTodoList()">
☑ 開発TODO
</button>

<button
class="float-list-btn"
onclick="renderDevLogList()">
📚 開発履歴
</button>

<hr>

<button class="float-list-btn" onclick="clearOutput()">
🧹 出力クリア
</button>

<button class="float-list-btn" onclick="clearHistory()">
🗑 履歴全削除
</button>

<button class="float-list-btn"onclick="
reloadAppPage()">
🔄 ページ更新
</button>

`;
}

function buildRepairToolsHtml() {
  return `

<button class="float-list-btn"
  onclick="loadRepairHtml()">
📖 HTML読込
</button>

<button class="float-list-btn" onclick="backupPartialScript()">
📦 JS部分読込
</button>

<button class="float-list-btn"
  onclick="copyRepairHtml()">
📋 HTMLコピー
</button>

<button class="float-list-btn"
  onclick="saveRepairHtml()">
💾 現在ファイル保存
</button>

<hr>

<button class="float-list-btn" onclick="selectFunctionBlock()">
📦 関数選択
</button>

<button class="float-list-btn" onclick="replaceFunctionBlock()">
✏ 関数置換
</button>

<button class="float-list-btn" onclick="showFunctionList()">
📚 コードブロック一覧
</button>

<button class="float-list-btn" onclick="showFunctionSortList()">
↕コードブロック並べ替え
</button>

<button class="float-list-btn" onclick="toggleRepairSearchBox()">
🔍 検索
</button>

<button class="float-list-btn" onclick="openReplacePanel()">
🔁 検索置換
</button>

<hr>

<button class="float-list-btn" onclick="cleanupCandidates()">
🧹 削除候補チェック
</button>

<button class="float-list-btn" onclick="deleteCommentedCleanupBlocks()">
🗑 コメント化済みを完全削除
</button>

<hr>

<button class="float-list-btn" onclick="openViewerMode()">
👁 閲覧モード
</button>

<hr>

<button class="float-list-btn"
 onclick="showRepairDiff()">
🧩 Diff
</button>

<button
class="float-list-btn"
onclick="saveRepairDiff()">
💾 Diff保存
</button>

<button
class="float-list-btn"
onclick="savePatchedRepairHtml()">
💾 Patched HTML保存
</button>

<button class="float-list-btn"
onclick="showRepairLineDiff()">
🧾 Line Diff
</button>

<button class="float-list-btn"
onclick="loadAndApplyRepairDiff()">
📂 Diff適用
</button>

<button class="float-list-btn" onclick="diagnoseRepairHtml()">
🩺 編集内容診断
</button>

<button class="float-list-btn" onclick="showHtmlHealth()">
💚 HTML HEALTH
</button>

`;
}

function toggleToolsMenu(){
  const panel = get("floatPanel");
  if (panel.style.display !== "none") {
    closeFloatPanel();
    return;
  }
  get("toolsBtn").innerText = "×";
  const repairMode = isRepairMode();
  const title = repairMode
    ? "修復ツール"
    : "通常ツール";
  const bodyHtml = repairMode
    ? buildRepairToolsHtml()
    : buildNormalToolsHtml();
  openFloatPanel(title, bodyHtml);
}

function resetRepairEditorView() {
  const editor = get("repairEditor");
  if (!editor) return;

  editor.scrollLeft = 0;
  editor.style.width = "100%";
  editor.style.maxWidth = "100%";
  updateRepairQuickPanelVisibility();

}

/* ===============================
   Float Panel Core
=============================== */

function backFloatPanel() {

  const panel =
    get("floatPanel");

  if (
    !panel ||
    floatPanelHistory.length === 0
  ) {
    return;
  }

  panel.innerHTML =
    floatPanelHistory.pop();
}

function moveFloatPanelCorner(pos) {

  const panel =
    get("floatPanel");

  if (!panel) return;

  panel.style.top = "";
  panel.style.left = "";
  panel.style.right = "";
  panel.style.bottom = "";

  switch(pos){

    case "tl":

      panel.style.left =
        "18px";

      panel.style.top =
        "18px";

      break;

    case "tr":

      panel.style.right =
        "18px";

      panel.style.top =
        "18px";

      break;

    case "bl":

      panel.style.left =
        "18px";

      panel.style.bottom =
        "88px";

      break;

    case "br":

      panel.style.right =
        "18px";

      panel.style.bottom =
        "88px";

      break;

  }
}

function openFloatPanel(title, bodyHtml){

  const panel =
    get("floatPanel");

  if (
    panel &&
    panel.style.display === "block"
  ) {
    floatPanelHistory.push(
      panel.innerHTML
    );

    if (
      floatPanelHistory.length > 20
    ) {
      floatPanelHistory.shift();
    }
  }

  panel.innerHTML =
    `<div class="float-panel-header">

      <span class="float-panel-title">
        ${title}
      </span>

      <button
      onclick="moveFloatPanelCorner('tl')">
      ↖
      </button>

      <button
      onclick="moveFloatPanelCorner('tr')">
      ↗
      </button>

      <button
      onclick="moveFloatPanelCorner('bl')">
      ↙
      </button>

      <button
      onclick="moveFloatPanelCorner('br')">
      ↘
      </button>

      <button
      onclick="resetFloatPanelPosition()">
      □
      </button>

      <button
      onclick="backFloatPanel()">
      ◀
      </button>

      <button
      onmousedown="event.preventDefault()"
      onclick="closeFloatPanelKeepEditorSelection()">
      ×
      </button>

    </div>`
    +
    bodyHtml;

  panel.style.display =
    "block";
}

function moveFloatPanelBy(dx, dy) {
  const panel = get("floatPanel");
  if (!panel) return;

  const rect = panel.getBoundingClientRect();

  let nextLeft = rect.left + dx;
  let nextTop = rect.top + dy;

  const maxLeft =
    window.innerWidth - rect.width;

  const maxTop =
    window.innerHeight - rect.height;

  nextLeft =
    Math.min(
      Math.max(0, nextLeft),
      Math.max(0, maxLeft)
    );

  nextTop =
    Math.min(
      Math.max(0, nextTop),
      Math.max(0, maxTop)
    );

  panel.style.left = nextLeft + "px";
  panel.style.top = nextTop + "px";
  panel.style.right = "auto";
  panel.style.bottom = "auto";
}

function resetFloatPanelPosition() {
  const panel = get("floatPanel");
  if (!panel) return;

  panel.style.left = "auto";
  panel.style.top = "auto";
  panel.style.right = "18px";
  panel.style.bottom = "88px";
}

function closeFloatPanelKeepEditorSelection() {
  const editor = get("repairEditor");
  const start = editor ? editor.selectionStart : null;
  const end = editor ? editor.selectionEnd : null;

  closeFloatPanel();

  if (editor && start !== null && end !== null) {
    setTimeout(() => {
      editor.focus();
      editor.setSelectionRange(start, end);

      if (typeof updateCursorPosition === "function") {
        updateCursorPosition();
      }
    }, 0);
  }
}

function closeFloatPanel(){
  get("floatPanel").style.display = "none";
  const btn = get("toolsBtn");
  if(btn){
    btn.innerText = "⚙";
  }
}

<div id="repairQuickPanel" class="repair-quick-panel">

  <div class="small">Quick</div>

  <button
    id="repairQuickToggle"
    class="repair-quick-toggle"
    onclick="toggleRepairQuickPanel()">
    ◀
  </button>

  <button class="float-list-btn" onclick="undoRepairEdit()">↩ Undo</button>
  <button class="float-list-btn" onclick="redoRepairEdit()">↪ Redo</button>
  <button class="float-list-btn" onclick="indentRepairSelection()">➡イン</button>
  <button class="float-list-btn" onclick="outdentRepairSelection()">⬅アウト</button>
  <button class="float-list-btn" onclick="toggleRepairAutoSave()">💾Save</button>
  <button class="float-list-btn" onclick="scrollRepairTop()">⏫上部</button>
  <button class="float-list-btn" onclick="scrollRepairBottom()">⏬下部</button>
  <button class="float-list-btn" onclick="reloadAppPage()">🔄更新</button>

</div>

function initRepairQuickPanel() {
  if (get("repairQuickPanel")) {
    updateRepairQuickPanelVisibility();
    return;
  }

  const wrap = document.createElement("div");
  wrap.innerHTML = buildRepairQuickToolsHtml();

  const panel = wrap.firstElementChild;
  if (!panel) return;

  panel.style.display = "none";

  document.body.appendChild(panel);

  updateRepairQuickPanelVisibility();
}

function toggleRepairQuickPanel() {
  const panel = get("repairQuickPanel");
  const toggle = get("repairQuickToggle");

  if (!panel || !toggle) {
    console.warn("repair quick panel not found");
    return;
  }

  const closed =
    panel.classList.toggle("closed");

  toggle.textContent =
    closed
      ? "▶"
      : "◀";

  console.log("repairQuickPanel closed:", closed);
}

function updateRepairQuickPanelVisibility() {
  const panel = get("repairQuickPanel");
  if (!panel) return;

  const visible =
    isRepairMode();

  panel.style.display =
    visible
      ? "flex"
      : "none";
}

