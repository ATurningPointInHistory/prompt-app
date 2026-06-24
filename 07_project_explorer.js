/* ===============================
   FILE: 07_project_explorer.js
   Project Explorer
=============================== */

/*
役割
・Projectファイル一覧表示
・カテゴリ別表示
・Repair Editorへのファイル切替

利用する共通基盤
・getProjectFileNames()
・getProjectFilesByCategory()
・saveCurrentSearchEditorFile()
・openRepairTarget()

注意
・build系はHTML生成のみ
・State更新は直接しない
*/

/* ===============================
   Build Project Explorer HTML
=============================== */

/* ===============================
   Build Project Explorer HTML
=============================== */

function buildProjectExplorerHtml() {

  const state =
    buildProjectState();

  return `
<div class="float-panel-header">
  <div class="float-panel-title">📁 Project Explorer</div>
  <button onclick="closeFloatPanel()">×</button>
</div>

<div class="small">
  Files : ${state.files.length}
</div>

${buildProjectExplorerCategoryHtml(
  "📄 HTML",
  state.html
)}

${buildProjectExplorerCategoryHtml(
  "📜 JavaScript",
  state.js
)}

${buildProjectExplorerCategoryHtml(
  "🎨 CSS",
  state.css
)}

${buildProjectExplorerCategoryHtml(
  "📦 JSON",
  state.json
)}

${buildProjectExplorerCategoryHtml(
  "📁 Other",
  state.other
)}
`;

}

/* ===============================
   Build Project Explorer Category HTML
=============================== */

function buildProjectExplorerCategoryHtml(
  title,
  files
) {

  if (!files || !files.length) {
    return "";
  }

  const rows =
    files.map(file => {

      const fileName =
        file.path ||
        file.fileName ||
        "";

      const active =
        fileName === currentRepairFile ||
        file.fileName === currentRepairFile
          ? "▶ "
          : "📄 ";

      return `
<button
  class="float-list-btn"
  onclick="executeOpenProjectExplorerFile('${escapeJs(fileName)}')"
>
${active}${escapeHtml(fileName)}
</button>
`;

    }).join("");

  return `
<div class="tool-section-title">
  ${escapeHtml(title)} (${files.length})
</div>
${rows}
`;

}

/* ===============================
   Show Project Explorer
=============================== */

function showProjectExplorer() {

  const panel =
    get("floatPanel");

  if (!panel) {
    alert("floatPanel がありません");
    return;
  }

  panel.style.display =
    "block";

  panel.innerHTML =
    buildProjectExplorerHtml();

}

/* ===============================
   Execute Open Project Explorer File
=============================== */

function executeOpenProjectExplorerFile(
  fileName
) {

  if (
    typeof saveCurrentSearchEditorFile ===
    "function"
  ) {
    saveCurrentSearchEditorFile();
  }

  if (
    !openRepairTarget(
      fileName,
      1
    )
  ) {
    return;
  }

  showProjectExplorer();

  if (
    typeof updateRepairStatus ===
    "function"
  ) {
    updateRepairStatus(
      `${fileName} を開きました`
    );
  }

}