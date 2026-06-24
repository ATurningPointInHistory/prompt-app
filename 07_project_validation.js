/* ===============================
   FILE: 07_project_validation.js
   Project Validation
=============================== */

/* ===============================
   Build Project Validation Todo Text
   Validation ReportからTODO追加用テキストを生成
=============================== */

/*
役割
・Project構成チェック
・Missing / Duplicate検出
・Validation Report生成

注意
・build系はReport生成のみ
・show系は表示のみ
・execute系は実行制御のみ
*/

/* ===============================
   Build Project Validation Report
=============================== */

function buildProjectValidationReport() {

  const scripts =
    [
      ...document.querySelectorAll(
        "script[src]"
      )
    ].map(script =>
      cleanProjectFilePath(
        script.getAttribute("src")
      )
    );

  const css =
    [
      ...document.querySelectorAll(
        "link[rel='stylesheet'][href]"
      )
    ].map(link =>
      cleanProjectFilePath(
        link.getAttribute("href")
      )
    );

  const fileMap =
    buildProjectFileMap();

  const loadedFiles =
    Object.keys(
      fileMap
    );

  const missingFiles =
    [
      ...new Set(
        scripts
          .concat(css)
          .filter(fileName =>
            fileName &&
            !loadedFiles.includes(
              fileName
            )
          )
      )
    ];

  const duplicateScripts =
    findDuplicateProjectItems(
      scripts
    );

  const duplicateCss =
    findDuplicateProjectItems(
      css
    );

  const issueCount =
    missingFiles.length +
    duplicateScripts.length +
    duplicateCss.length;

  return {

    score:
      Math.max(
        0,
        100 - issueCount * 10
      ),

    files:
      loadedFiles.length,

    scriptCount:
      scripts.length,

    cssCount:
      css.length,

    missingFiles,
    duplicateScripts,
    duplicateCss,

    createdAt:
      new Date().toISOString()

  };

}

/* ===============================
   Find Duplicate Project Items
=============================== */

function findDuplicateProjectItems(
  list
) {

  const seen =
    new Set();

  const dup =
    new Set();

  list
    .filter(Boolean)
    .forEach(item => {

      if (seen.has(item)) {
        dup.add(item);
      }

      seen.add(item);

    });

  return [...dup];

}

/* ===============================
   Build Project Validation Html
=============================== */

function buildProjectValidationHtml(
  report
) {

  return `
<div class="float-panel-header">
  <div class="float-panel-title">🧭 Project Validation</div>
  <button onclick="closeFloatPanel()">×</button>
</div>

<pre class="project-package-report">
Project Validation

Score : ${report.score}/100
Files : ${report.files}
Scripts : ${report.scriptCount}
CSS : ${report.cssCount}

Missing : ${report.missingFiles.length}
Duplicate Script : ${report.duplicateScripts.length}
Duplicate CSS : ${report.duplicateCss.length}
</pre>

<button
  class="float-list-btn"
  onclick="executeAddProjectValidationTodos()">
  ☑ Validation結果をTODOへ追加
</button>

${buildProjectValidationSectionHtml(
  "Missing Files",
  report.missingFiles
)}

${buildProjectValidationSectionHtml(
  "Duplicate Scripts",
  report.duplicateScripts
)}

${buildProjectValidationSectionHtml(
  "Duplicate CSS",
  report.duplicateCss
)}
`;

}

/* ===============================
   Build Project Validation Section Html
=============================== */

function buildProjectValidationSectionHtml(
  title,
  items
) {

  if (!items || !items.length) {
    return `
<div class="small">
  ✅ ${escapeHtml(title)} : none
</div>
`;
  }

  return `
<div class="tool-section-title">
  ⚠ ${escapeHtml(title)}
</div>

${items.map(item => `
<div class="small">
  ・${escapeHtml(item)}
</div>
`).join("")}
`;

}

/* ===============================
   Show Project Validation
=============================== */

function showProjectValidation(
  report
) {

  const panel =
    get("floatPanel");

  if (!panel) {
    alert("floatPanel がありません");
    return;
  }

  panel.style.display =
    "block";

  panel.innerHTML =
    buildProjectValidationHtml(
      report
    );

}

/* ===============================
   Execute Project Validation
=============================== */

function executeProjectValidation() {

  const report =
    buildProjectValidationReport();

  showProjectValidation(
    report
  );

}

function buildProjectValidationTodoText(
  report
) {

  const lines = [];

  if (
    report.missingFiles &&
    report.missingFiles.length
  ) {
    report.missingFiles.forEach(file => {
      lines.push(
        `Missing file 修正: ${file}`
      );
    });
  }

  if (
    report.duplicateScripts &&
    report.duplicateScripts.length
  ) {
    report.duplicateScripts.forEach(file => {
      lines.push(
        `重複script修正: ${file}`
      );
    });
  }

  if (
    report.duplicateCss &&
    report.duplicateCss.length
  ) {
    report.duplicateCss.forEach(file => {
      lines.push(
        `重複CSS修正: ${file}`
      );
    });
  }

  return lines.join("\n");

}

/* ===============================
   Execute Add Project Validation Todos
   Validation結果を既存TODOへ追加
=============================== */

function executeAddProjectValidationTodos() {

  const report =
    buildProjectValidationReport();

  const text =
    buildProjectValidationTodoText(
      report
    );

  if (!text.trim()) {
    alert(
      "TODO化するValidation項目はありません"
    );
    return;
  }

  if (
    typeof saveTodoItems !==
    "function"
  ) {
    alert(
      "saveTodoItems が見つかりません"
    );
    return;
  }

  saveTodoItems(
    text
  );

  alert(
    "Project Validation結果をTODOへ追加しました"
  );

}

