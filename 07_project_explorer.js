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