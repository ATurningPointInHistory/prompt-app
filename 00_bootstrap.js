/* ===============================
   FILE: 00_bootstrap.js
   Bootstrap / Shared Core
=============================== */

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
<button class="float-list-btn" onclick="toggleTemplateManager()">🧩 テンプレ管理</button>
<button class="float-list-btn" onclick="toggleDangerManager()">⚠ 危険ワード管理</button>
<button class="float-list-btn" onclick="togglePatternManager()">🚫 NGパターン管理</button>
<button class="float-list-btn" onclick="toggleAiPresetManager()">🤖 AIプリセット管理</button>
<hr>
<button class="float-list-btn" onclick="backupProgram()">💾 結合HTML出力</button>
<button class="float-list-btn" onclick="showBackupHistory()">📚 バックアップ履歴</button>
<button class="float-list-btn" onclick="saveProgramHtml()">💾 本体HTML保存</button>
<button class="float-list-btn" onclick="restoreProgramBackup()">♻ フル復元</button>
<hr>
<button class="float-list-btn" onclick="reviewPrompt()">🛠 Promptレビュー</button>
<button class="float-list-btn" onclick="testPromptObject()">🧩 内部JSONテスト</button>
<button class="float-list-btn" onclick="testJsonFormat()">🧪 JSONテスト</button>
<button class="float-list-btn" onclick="formatJsonOutput()">📦 JSON整形</button>
<button class="float-list-btn" onclick="recheckOutput()">🔍 再チェック</button>
<button class="float-list-btn" onclick="diagnoseHtml()">🩺 HTML診断</button>
<button class="float-list-btn" onclick="compareBackupSummary()">📊 バックアップ差分確認</button>
<button class="float-list-btn"
  onclick="previewRepairHtml()">🎨 色分けプレビュー</button>
<button class="float-list-btn" onclick="showHtmlHealth()">💚 HTML HEALTH</button>
<hr>
<button class="float-list-btn" onclick="exportTemplates()">📤 テンプレ保存</button>
<button class="float-list-btn" onclick="importTemplates()">📥 テンプレ復元</button>
<button class="float-list-btn" onclick="exportAiPresets()">🤖 AI設定バックアップ</button>
<button class="float-list-btn" onclick="importAiPresets()">🤖 AI設定復元</button>
<button class="float-list-btn" onclick="renderTodoList()">☑ 開発TODO</button>
<hr>
<button class="float-list-btn" onclick="clearOutput()">🧹 出力クリア</button>
<button class="float-list-btn" onclick="clearHistory()">🗑 履歴全削除</button>
<button class="float-list-btn"onclick="reloadAppPage()">🔄 ページ更新</button>
`;
}

function buildRepairToolsHtml() {
  return `
<button class="float-list-btn"
  onclick="loadRepairHtml()">📖 HTML読込</button>
<button class="float-list-btn" onclick="backupPartialScript()">📦 JS部分読込</button>
<button class="float-list-btn"
  onclick="copyRepairHtml()">📋 HTMLコピー</button>
<button class="float-list-btn"
  onclick="saveRepairHtml()">💾 現在ファイル保存</button>
<hr>


<button class="float-list-btn" onclick="diagnoseRepairHtml()">🩺 編集内容診断</button>
<button class="float-list-btn" onclick="selectFunctionBlock()">📦 関数選択</button>
<button class="float-list-btn" onclick="replaceFunctionBlock()">✏ 関数置換</button>
<button class="float-list-btn" onclick="showFunctionList()">📚 コードブロック一覧</button>
<button class="float-list-btn" onclick="showFunctionSortList()">↕コードブロック並べ替え</button>
<button class="float-list-btn" onclick="toggleRepairSearchBox()">🔍 検索</button>
<button class="float-list-btn" onclick="openReplacePanel()">🔁 検索置換</button>
<hr>
<button class="float-list-btn" onclick="undoRepairEdit()">↩ Undo</button>
<button class="float-list-btn" onclick="redoRepairEdit()">↪ Redo</button>
<button class="float-list-btn"
  onclick="indentRepairSelection()">➡ インデント</button>
<button class="float-list-btn"
  onclick="outdentRepairSelection()">⬅ アウトデント</button>
<button class="float-list-btn" onclick="toggleRepairAutoSave()">💾 AutoSave</button>
<hr>
<button class="float-list-btn" onclick="cleanupCandidates()">🧹 削除候補チェック</button>
<button class="float-list-btn" onclick="deleteCommentedCleanupBlocks()">🗑 コメント化済みを完全削除</button>
<button class="float-list-btn" onclick="previewRepairHtml()">🎨 色分けプレビュー</button>
<button class="float-list-btn" onclick="showHtmlHealth()">💚 HTML HEALTH</button>
<button class="float-list-btn" onclick="reloadAppPage()">🔄 ページ更新</button>
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
}

/* ===============================
   Float Panel Core
=============================== */

function openFloatPanel(title, bodyHtml){
  const panel = get("floatPanel");

  panel.innerHTML =
    `<div class="float-panel-header">
      <span class="float-panel-title">${title}</span>
      <button onclick="moveFloatPanelBy(0,-60)">↑</button>
      <button onclick="moveFloatPanelBy(0,60)">↓</button>
      <button onclick="moveFloatPanelBy(-60,0)">←</button>
      <button onclick="moveFloatPanelBy(60,0)">→</button>
      <button onclick="resetFloatPanelPosition()">↘</button>
      <button onmousedown="event.preventDefault()"
      onclick="closeFloatPanelKeepEditorSelection()">×</button>
    </div>` +
    bodyHtml;

  panel.style.display = "block";
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
      updateCursorPosition();
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
