/* ===============================
   FILE: 07_project_explorer.js
   Project Explorer
=============================== */

/*
役割
・現在プロジェクトのファイル一覧管理
・Project Explorer表示
・ファイル切替
・Projectファイル選択

責務
build
  ・HTML生成のみ

show
  ・Project Explorer表示

update
  ・Project Explorer更新
  ・選択状態更新

execute
  ・ファイルを開く
  ・Project操作実行

共通利用
・repairSearchFileStore
・ProjectManager
・Repair Editor
・Project Package
・Global Search

注意
・build系でDOM変更禁止
・State更新はManager経由
・UIは表示のみ
*/

/* ===============================
   Build Project Explorer HTML
=============================== */

function buildProjectExplorerHtml(
  files
) {

  const rows =
    files.map(fileName => `
<button
  class="float-list-btn"
  onclick="executeOpenProjectExplorerFile('${escapeJs(fileName)}')"
>
📄 ${escapeHtml(fileName)}
</button>
`).join("");

  return `
<div class="float-panel-header">
  <div class="float-panel-title">📁 Project Explorer</div>
  <button onclick="closeFloatPanel()">×</button>
</div>

<div class="small">
  Files : ${files.length}
</div>

${rows || `<div class="small">ファイル未読込</div>`}
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

  const files =
    Object.keys(
      repairSearchFileStore || {}
    );

  panel.style.display =
    "block";

  panel.innerHTML =
    buildProjectExplorerHtml(
      files
    );

}

/* ===============================
   Open Project File
=============================== */

function executeOpenProjectExplorerFile(
  fileName
) {

  saveCurrentSearchEditorFile();

  openRepairTarget(
    fileName,
    1
  );

  if (
    typeof updateRepairStatus ===
    "function"
  ) {
    updateRepairStatus(
      `${fileName} を開きました`
    );
  }

}