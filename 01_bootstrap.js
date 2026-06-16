/* ===============================
   FILE: 01_bootstrap.js
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

  const pairs = [
    ["templateBtn", "template-manager"],
    ["dangerBtn", "danger-manager"],
    ["patternBtn", "pattern-manager"],
    ["aiPresetBtn", "ai-preset-manager"]
  ];

  pairs.forEach(([btnId, panelId]) => {

    const btn =
      get(btnId);

    const panel =
      get(panelId);

    if (!btn || !panel) {
      return;
    }

    btn.classList.toggle(
      "active-panel",
      panel.style.display !== "none"
    );
  });
}

/* ===============================
   App Navigation / Tools Menu
=============================== */
function switchAppPage(mode) {

  closeFloatPanel();

  const appPage =
    get("appPage");

  const repairPage =
    get("repairPage");

  const appPageTab =
    get("appPageTab");

  const repairPageTab =
    get("repairPageTab");

  if (appPage) {
    appPage.style.display =
      mode === "app"
        ? "block"
        : "none";
  }

  if (repairPage) {
    repairPage.style.display =
      mode === "repair"
        ? "block"
        : "none";
  }

  if (appPageTab) {
    appPageTab.classList.toggle(
      "active",
      mode === "app"
    );
  }

  if (repairPageTab) {
    repairPageTab.classList.toggle(
      "active",
      mode === "repair"
    );
  }

  if (
    mode === "repair" &&
    typeof resetRepairEditorView === "function"
  ) {
    resetRepairEditorView();
  }

  if (typeof updateRepairSearchQuickVisibility === "function") {
    updateRepairSearchQuickVisibility();
  }
}

function isRepairMode() {
  const page =
    get("repairPage");

  if (!page) {
    return false;
  }

  return page.style.display !== "none";
}

function buildNormalToolsHtml() {
  return `

<div class="small">💚 診断・確認</div>

<button class="float-list-btn" onclick="showMobileConsole()">
📱 Console
</button>

<button class="float-list-btn" onclick="showHtmlHealth()">
💚 HTML HEALTH
</button>

<button class="float-list-btn" onclick="diagnoseHtml()">
🩺 HTML簡易診断
</button>

<button class="float-list-btn" onclick="analyzeProjectJsDependency()">
🧭 JS読込診断
</button>

<button class="float-list-btn" onclick="showFunctionRelationMap()">
🌳 関数関連図
</button>

<button class="float-list-btn" onclick="previewRepairHtml()">
🎨 色分けプレビュー
</button>

<hr>

<div class="small">💾 保存・バックアップ</div>

<button class="float-list-btn" onclick="saveProjectPackage()">
📦 プロジェクトZIP保存
</button>

<button class="float-list-btn" onclick="backupProgram()">
💾 結合HTMLバックアップ
</button>

<button class="float-list-btn" onclick="saveProgramHtml()">
💾 本体HTML保存
</button>

<button class="float-list-btn" onclick="showBackupHistory()">
📚 バックアップ履歴
</button>

<button class="float-list-btn" onclick="restoreProgramBackup()">
♻ 設定復元
</button>

<button class="float-list-btn" onclick="compareBackupSummary()">
📊 バックアップ差分
</button>

<hr>

<div class="small">🧩 設定・管理</div>

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

<div class="small">🛠 通常モード支援</div>

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

<hr>

<div class="small">📤 インポート・エクスポート</div>

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

<div class="small">📚 開発管理</div>

<button class="float-list-btn" onclick="renderTodoList()">
☑ 開発TODO
</button>

<button class="float-list-btn" onclick="renderDevLogList()">
📚 開発履歴
</button>

<hr>

<div class="small">🧹 その他</div>

<button class="float-list-btn" onclick="showMemoBox()">
📝 Memo
</button>

<button class="float-list-btn" onclick="clearOutput()">
🧹 出力クリア
</button>

<button class="float-list-btn" onclick="clearHistory()">
🗑 履歴全削除
</button>

<button class="float-list-btn" onclick="reloadAppPage()">
🔄 ページ更新
</button>

`;
}

function buildRepairToolsHtml() {
  return `

<div class="small">💚 診断・確認</div>

<button class="float-list-btn" onclick="showMobileConsole()">
📱 Console
</button>

<button class="float-list-btn" onclick="showHtmlHealth()">
💚 HTML HEALTH
</button>

<button class="float-list-btn" onclick="diagnoseRepairHtml()">
🩺 編集内容診断
</button>

<button class="float-list-btn" onclick="analyzeProjectJsDependency()">
🧭 JS読込診断
</button>

<button class="float-list-btn" onclick="showFunctionRelationMap()">
🌳 関数関連図
</button>

<hr>

<div class="small">⚙ AI支援</div>

<button class="float-list-btn" onclick="openProjectConfigManager()">
⚙ Project Config
</button>

<button class="float-list-btn" onclick="analyzeAiInstruction()">
🧠 AI指示解析
</button>

<button class="float-list-btn" onclick="analyzeAiGeneratedCode()">
🤖 AIコード解析
</button>

<button class="float-list-btn" onclick="generateErrorPrompt()">
🧯 AIエラー調査プロンプト生成
</button>

<button class="float-list-btn" onclick="copyErrorPrompt()">
📋 AIエラー調査プロンプトコピー
</button>

<hr>

<div class="small">💾 ファイル操作</div>

<button class="float-list-btn" onclick="loadRepairHtml()">
📖 HTML読込
</button>

<button class="float-list-btn" onclick="backupPartialScript()">
📦 JS部分読込
</button>

<button class="float-list-btn" onclick="copyRepairHtml()">
📋 HTMLコピー
</button>

<button class="float-list-btn" onclick="saveRepairHtml()">
💾 現在ファイル保存
</button>

<button class="float-list-btn" onclick="savePatchedRepairHtml()">
💾 Patched HTML保存
</button>

<hr>

<div class="small">✏ 編集・整理</div>

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
↕ コードブロック並べ替え
</button>

<button class="float-list-btn" onclick="openViewerMode()">
👁 閲覧モード
</button>

<hr>

<div class="small">↩ 編集操作</div>

<button class="float-list-btn" onclick="undoRepairEdit()">
↩ Undo
</button>

<button class="float-list-btn" onclick="redoRepairEdit()">
↪ Redo
</button>

<button class="float-list-btn" onclick="indentRepairSelection()">
➡ インデント
</button>

<button class="float-list-btn" onclick="outdentRepairSelection()">
⬅ アウトデント
</button>

<button class="float-list-btn" onclick="toggleRepairAutoSave()">
💾 AutoSave
</button>

<hr>

<div class="small">🧹 削除・整理</div>

<button class="float-list-btn" onclick="cleanupCandidates()">
🧹 削除候補チェック
</button>

<button class="float-list-btn" onclick="deleteCommentedCleanupBlocks()">
🗑 コメント化済みを完全削除
</button>

<hr>

<div class="small">🧩 Diff・差分</div>

<button class="float-list-btn" onclick="showRepairDiff()">
🧩 Function Diff
</button>

<button class="float-list-btn" onclick="showRepairLineDiff()">
🧾 Line Diff
</button>

<button class="float-list-btn" onclick="saveRepairDiff()">
💾 Diff保存
</button>

<button class="float-list-btn" onclick="loadAndApplyRepairDiff()">
📂 Diff適用
</button>

<hr>

<div class="small">⬆ 移動・その他</div>

<button class="float-list-btn" onclick="scrollRepairTop()">
⏫ 最上部
</button>

<button class="float-list-btn" onclick="scrollRepairBottom()">
⏬ 最下部
</button>

<button class="float-list-btn" onclick="showMemoBox()">
📝 Memo
</button>

<button class="float-list-btn" onclick="reloadAppPage()">
🔄 ページ更新
</button>

`;
}

function buildRepairSearchQuickHtml() {
  return `
<div id="repairSearchQuickPanel"
     class="repair-search-quick-panel">

    <div
      id="repairSearchQuickHeader"
      class="small"
      style="cursor:move;">
      <hr>move<hr>
    </div>

  <button
    id="repairSearchQuickToggle"
    class="repair-search-quick-toggle"
    onclick="toggleRepairSearchQuickPanel()">
    ▶
  </button>

  <button class="float-list-btn" onclick="toggleRepairSearchPopup()">🔍<br>検索</button>
  <button class="float-list-btn" onclick="toggleRepairReplacePopup()">🔁<br>置換</button>
  <button class="float-list-btn" onclick="searchRepairNext()">⏭<br>次</button>

  <button class="float-list-btn" onclick="loadRepairSearchFiles()">📁<br>読込</button>
  <button class="float-list-btn" onclick="loadCurrentProjectSearchFiles()">📦<br>現在</button>
  <button class="float-list-btn" onclick="showRepairSearchFiles()">📋<br>一覧</button>
  <button class="float-list-btn" onclick="showSearchHistory()">🕘<br>履歴</button>
  <button class="float-list-btn" onclick="searchAllRepairFiles()">📚<br>全検</button>

  <button class="float-list-btn" onclick="startMacroRecording()">🔴<br>記録</button>
  <button class="float-list-btn" onclick="stopMacroRecording()">⏹<br>保存</button>
  <button class="float-list-btn" onclick="showMacroList()">▶<br>実行</button>
  <button class="float-list-btn" onclick="addMacroInputStep()">⌨<br>入力</button>

</div>
`;
}

function toggleRepairSearchQuickPanel() {

  const panel =
    get("repairSearchQuickPanel");

  const toggle =
    get("repairSearchQuickToggle");

  if (!panel || !toggle) {
    return;
  }

  const closed =
    panel.classList.toggle(
      "closed"
    );

  toggle.textContent =
    closed
      ? "◀"
      : "▶";
}

function initRepairSearchQuickPanel() {

  if (get("repairSearchQuickPanel")) {

    updateRepairSearchQuickVisibility();

    if (
      typeof enableRepairSearchQuickDrag ===
      "function"
    ) {
      enableRepairSearchQuickDrag();
    }

    return;
  }

  const wrap =
    document.createElement("div");

  wrap.innerHTML =
    buildRepairSearchQuickHtml();

  const panel =
    wrap.firstElementChild;

  if (!panel) {
    return;
  }

  panel.style.display =
    "none";

  document.body.appendChild(
    panel
  );

  updateRepairSearchQuickVisibility();

  if (
    typeof enableRepairSearchQuickDrag ===
    "function"
  ) {
    enableRepairSearchQuickDrag();
  }
}

function updateRepairSearchQuickVisibility() {

  const panel =
    get("repairSearchQuickPanel");

  if (!panel) {
    return;
  }

  panel.style.display =
    isRepairMode()
      ? "flex"
      : "none";
}

function enableRepairSearchQuickDrag() {

  const panel =
    get("repairSearchQuickPanel");

  const header =
    get("repairSearchQuickHeader");

  if (!panel || !header) {
    return;
  }

  let dragging = false;
  let startY = 0;
  let startTop = 0;

  function start(e) {

    dragging = true;

    startY =
      e.touches
        ? e.touches[0].clientY
        : e.clientY;

    startTop =
      parseInt(
        panel.style.top || "80",
        10
      );
  }

  function move(e) {

    if (!dragging) {
      return;
    }

    const y =
      e.touches
        ? e.touches[0].clientY
        : e.clientY;

    const nextTop =
      startTop + (y - startY);

    const minTop = 8;

    const maxTop =
      window.innerHeight -
      panel.offsetHeight -
      20;

    panel.style.top =
      Math.min(
        Math.max(minTop, nextTop),
        Math.max(minTop, maxTop)
      ) + "px";
  }

  function end() {
    dragging = false;
  }

  header.addEventListener("mousedown", start);
  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", end);

  header.addEventListener("touchstart", start);
  document.addEventListener("touchmove", move);
  document.addEventListener("touchend", end);
}

function closeRepairPopups() {

  [
    "repairSearchPopup",
    "repairReplacePopup"
  ].forEach(id => {

    const el =
      get(id);

    if (el) {
      el.style.display =
        "none";
    }
  });
}
function toggleRepairSearchPopup() {

  let box =
    get("repairSearchPopup");

  if (box) {

    const opening =
      box.style.display === "none";

    closeRepairPopups();

    box.style.display =
      opening
        ? "block"
        : "none";

    return;
  }

  closeRepairPopups();

  box =
    document.createElement("div");

  box.id =
    "repairSearchPopup";

  box.innerHTML = `
  <div class="repair-search-toolbar">

    <input
      id="repairSearch"
      placeholder="検索">

    <button onclick="searchRepairText()">
      検索
    </button>

    <button onclick="searchRepairNext()">
      次へ
    </button>

  </div>

  <div id="repairSearchPopupResult"></div>
  `;

  document.body.appendChild(box);
}

function toggleRepairReplacePopup() {

  let box =
    get("repairReplacePopup");

  if (box) {

    const opening =
      box.style.display === "none";

    closeRepairPopups();

    box.style.display =
      opening
        ? "block"
        : "none";

    return;
  }

  closeRepairPopups();

  box =
    document.createElement("div");

  box.id =
    "repairReplacePopup";

  box.innerHTML = `
  <div class="repair-replace-toolbar">

    <input
      id="replaceFrom"
      placeholder="検索">

    <input
      id="replaceTo"
      placeholder="置換">

    <div class="repair-replace-actions">

      <button onclick="replaceRepairText()">
        1件
      </button>

      <button onclick="replaceAllRepairText()">
        全件
      </button>

    </div>

  </div>
  `;

  document.body.appendChild(box);
}

function toggleToolsMenu() {

  const panel =
    get("floatPanel");

  const btn =
    get("toolsBtn");

  if (!panel) {
    return;
  }

  if (panel.style.display !== "none") {
    closeFloatPanel();
    return;
  }

  if (btn) {
    btn.innerText = "×";
  }

  const repairMode =
    isRepairMode();

  const title =
    repairMode
      ? "修復ツール"
      : "通常ツール";

  const bodyHtml =
    repairMode
      ? buildRepairToolsHtml()
      : buildNormalToolsHtml();

  openFloatPanel(
    title,
    bodyHtml
  );
}

function resetRepairEditorView() {
  const editor = get("repairEditor");
  if (!editor) return;

  editor.scrollLeft = 0;
  editor.style.width = "100%";
  editor.style.maxWidth = "100%";
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

  const editor =
    get("repairEditor");

  const start =
    editor ? editor.selectionStart : null;

  const end =
    editor ? editor.selectionEnd : null;

  closeFloatPanel();

  if (editor && start !== null && end !== null) {
    setTimeout(() => {

      editor.focus();

      editor.setSelectionRange(
        start,
        end
      );

      if (typeof updateCursorPosition === "function") {
        updateCursorPosition();
      }

    }, 0);
  }
}

function closeFloatPanel() {

  const panel =
    get("floatPanel");

  if (panel) {
    panel.style.display =
      "none";
  }

  const btn =
    get("toolsBtn");

  if (btn) {
    btn.innerText =
      "⚙";
  }
}
