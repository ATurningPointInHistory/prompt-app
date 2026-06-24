/* ===============================
状態管理関数
=============================== */

function setCurrentRepairFile(
  fileName
) {

  currentRepairFile =
    fileName || "";

  const label =
    get(
      "currentRepairFileLabel"
    );

  if (label) {
    label.textContent =
      currentRepairFile || "未選択";
  }
}

/* ===============================
共通取得関数追加
=============================== */

function getProjectAnalyzeSources(
  mode = currentProjectAnalyzeMode
) {

  switch (mode) {

    case "editor":
      return getAnalyzeSourcesFromEditor();

    case "currentProject":
      return getAnalyzeSourcesFromCurrentProject();

    case "loadedFiles":
      return getAnalyzeSourcesFromLoadedFiles();

    default:
      return [];

  }

}

function getAnalyzeSourcesFromEditor() {

  const editor =
    get("repairEditor");

  if (!editor || !editor.value) {
    return [];
  }

  return [
    {
      fileName:
        currentRepairFile ||
        "Repair Editor",
      code:
        editor.value
    }
  ];

}

function getAnalyzeSourcesFromCurrentProject() {

  return getAnalyzeSourcesFromLoadedFiles();

}

function getAnalyzeSourcesFromLoadedFiles() {

  return getRepairSearchFiles();

}

function setCurrentProjectAnalyzeMode(
  mode
) {

  currentProjectAnalyzeMode =
    mode;

}

function getCurrentProjectAnalyzeMode() {

  return currentProjectAnalyzeMode;

}

function registerRepairSearchFile(
  fileName,
  text
) {

  if (!fileName) {
    return;
  }

  repairSearchFileStore[fileName] = {
    fileName: fileName,
    text: String(text || ""),
    updatedAt: Date.now()
  };

}

function clearRepairSearchFiles() {

  repairSearchFileStore =
    {};

}

function getRepairSearchFiles() {

  if (
    typeof repairSearchFileStore !== "object"
  ) {
    return [];
  }

  return Object
    .values(
      repairSearchFileStore
    )
    .map(file => ({
      fileName:
        file.fileName ||
        "unknown",

      code:
        file.code ||
        file.text ||
        ""
    }))
    .filter(file =>
      file.code
    );

}

/* ===============================
   Analyze Source Selector
=============================== */

function getAnalyzeSourceModeLabel(
  mode
) {

  switch (mode) {

    case "editor":
      return "Editor";

    case "currentProject":
      return "Current Project";

    case "loadedFiles":
      return "Downloaded";

    default:
      return "Unknown";

  }

}

function buildAnalyzeSourceSelectorHtml(
  options = {}
) {

  const label =
    options.label || "検索元";

  const onChange =
    options.onChange ||
    "changeAnalyzeSourceMode";

  const mode =
    typeof getCurrentProjectAnalyzeMode === "function"
      ? getCurrentProjectAnalyzeMode()
      : "currentProject";

  function radioMark(value) {
    return mode === value
      ? "🔘"
      : "⚪";
  }

  return `
<div
  class="small"
  style="
    margin-top:8px;
    margin-bottom:4px;
  ">

  <div style="margin-bottom:4px;">
    ${escapeHtml(label)}：
    ${escapeHtml(
      getAnalyzeSourceModeLabel(mode)
    )}
  </div>

  <div
    style="
      display:flex;
      gap:6px;
      flex-wrap:wrap;
      align-items:center;
    ">

    <button
      class="mini-btn"
      onclick="${onChange}('editor')">
      ${radioMark("editor")} Editor
    </button>

    <button
      class="mini-btn"
      onclick="${onChange}('currentProject')">
      ${radioMark("currentProject")} Current Project
    </button>

    <button
      class="mini-btn"
      onclick="${onChange}('loadedFiles')">
      ${radioMark("loadedFiles")} Downloaded
    </button>

  </div>

</div>
`;

}

async function changeAnalyzeSourceMode(
  mode
) {

  if (
    typeof setCurrentProjectAnalyzeMode ===
    "function"
  ) {
    setCurrentProjectAnalyzeMode(
      mode
    );
  }

  if (
    mode === "currentProject" &&
    typeof refreshCurrentProjectFunctionDatabase ===
      "function"
  ) {

    await refreshCurrentProjectFunctionDatabase();

  } else if (
    typeof updateProjectFunctionDatabase ===
    "function"
  ) {

    updateProjectFunctionDatabase(
      mode
    );

  }

  if (
    typeof updateDevConsoleSuggestions ===
    "function"
  ) {
    updateDevConsoleSuggestions();
  }

  if (
    typeof showMobileConsole ===
    "function"
  ) {
    showMobileConsole();
  }

}

/* ===============================
JUMP共通関数
=============================== */

function openRepairSearchFileAtLine(
  fileName,
  line
) {

  const file =
    repairSearchFileStore[
      fileName
    ];

  if (!file) {
    alert(
      "ファイル未読込\n\n" +
      fileName
    );
    return false;
  }

  const editor =
    get("repairEditor");

  if (!editor) {
    alert("repairEditor が見つかりません");
    return false;
  }

  editor.value =
    file.text ||
    file.code ||
    "";

  if (
    typeof setCurrentRepairFile ===
    "function"
  ) {
    setCurrentRepairFile(
      file.fileName ||
      fileName
    );
  } else {
    currentRepairFile =
      file.fileName ||
      fileName;
  }

  if (
    typeof updateLineNumbers ===
    "function"
  ) {
    updateLineNumbers();
  }

  if (
    typeof updateCursorPosition ===
    "function"
  ) {
    updateCursorPosition();
  }

  if (
    typeof jumpToLine ===
    "function"
  ) {
    jumpToLine(
      Number(line) || 1
    );
  }

  return true;

}

async function refreshCurrentProjectFunctionDatabase() {

  if (
    typeof loadCurrentProjectSearchFiles ===
    "function"
  ) {
    await loadCurrentProjectSearchFiles();
  }

  if (
    typeof updateProjectDatabase ===
    "function"
  ) {
    return updateProjectDatabase(
      "currentProject"
    );
  }

  return null;

}

/* ===============================
   Get Project Package File Text
=============================== */

async function getProjectPackageFileText(
  file
) {

  const store =
    repairSearchFileStore?.[
      file.path
    ];

  if (
    store &&
    typeof store.text === "string"
  ) {
    return {
      ok: true,
      text: store.text,
      source: "memory"
    };
  }

  if (file.source === "document") {

    return {
      ok: true,
      text:
        "<!DOCTYPE html>\n" +
        document.documentElement.outerHTML,
      source: "document"
    };

  }

  if (file.source === "generated") {

    return {
      ok: true,
      text: JSON.stringify(
        buildProjectPackageInfo(),
        null,
        2
      ),
      source: "generated"
    };

  }

  try {

    const res =
      await fetch(
        file.fetchPath ||
        file.path
      );

    if (!res.ok) {

      return {
        ok: false
      };

    }

    return {
      ok: true,
      text:
        await res.text(),
      source: "fetch"
    };

  } catch {

    return {
      ok: false
    };

  }

}

function escapeJs(text) {

  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, "\\n");

}

/* ===============================
   Project Manager Common
   repairSearchFileStore をProject共通データとして扱う
=============================== */

/* ===============================
   Get Project File Names
=============================== */

function getProjectFileNames() {

  if (
    typeof repairSearchFileStore !==
    "object" ||
    !repairSearchFileStore
  ) {
    return [];
  }

  return Object.keys(
    repairSearchFileStore
  );

}

/* ===============================
   Get Project Files
=============================== */

function getProjectFiles() {

  return getProjectFileNames()
    .map(fileName =>
      getProjectFile(fileName)
    )
    .filter(Boolean);

}

/* ===============================
   Get Project File
=============================== */

function getProjectFile(
  fileName
) {

  if (
    typeof repairSearchFileStore !==
    "object" ||
    !repairSearchFileStore
  ) {
    return null;
  }

  return repairSearchFileStore[
    fileName
  ] || null;

}

/* ===============================
   Update Project File
=============================== */

function updateProjectFile(
  fileName,
  text
) {

  if (!fileName) {
    return false;
  }

  if (
    typeof registerRepairSearchFile ===
    "function"
  ) {

    registerRepairSearchFile(
      fileName,
      text
    );

    return true;

  }

  repairSearchFileStore[fileName] = {
    fileName,
    text: String(text || ""),
    updatedAt: Date.now()
  };

  return true;

}

/* ===============================
   Get Project File Category
=============================== */

function getProjectFileCategory(
  fileName
) {

  const name =
    String(fileName || "")
      .toLowerCase()
      .split("?")[0];

  if (name.endsWith(".html")) {
    return "html";
  }

  if (name.endsWith(".js")) {
    return "js";
  }

  if (name.endsWith(".css")) {
    return "css";
  }

  if (name.endsWith(".json")) {
    return "json";
  }

  return "other";

}

/* ===============================
   Get Project Files By Category
=============================== */

function getProjectFilesByCategory() {

  const groups = {
    html: [],
    js: [],
    css: [],
    json: [],
    other: []
  };

  getProjectFileNames()
    .forEach(fileName => {

      const category =
        getProjectFileCategory(
          fileName
        );

      groups[category]
        .push(fileName);

    });

  return groups;

}

/* ===============================
   Build Current Project Load Report
=============================== */

function buildCurrentProjectLoadReport(
  loaded,
  failed,
  failedFiles
) {

  const lines = [];

  lines.push(
    `現在プロジェクト ${loaded}件を検索対象に登録しました`
  );

  lines.push("");

  lines.push(
    `失敗 : ${failed}件`
  );

  if (
    failedFiles &&
    failedFiles.length
  ) {

    lines.push("");

    lines.push(
      "=== Failed Files ==="
    );

    failedFiles.forEach(
      file =>
        lines.push(file)
    );

  }

  return lines.join("\n");

}

/* ===============================
   Build Project File Map
=============================== */

function buildProjectFileMap(
  files = getProjectFiles()
) {

  const map = {};

  files.forEach(file => {

    if (!file) {
      return;
    }

    map[
      cleanProjectFilePath(
        file.fileName
      )
    ] = file;

  });

  return map;

}

/* ===============================
   Build Project State
=============================== */

function buildProjectState(
  files = getProjectFiles()
) {

  const state = {

    files: [],

    fileMap: {},

    html: [],

    js: [],

    css: [],

    json: [],

    other: []

  };

  files.forEach(file => {

    if (!file) {
      return;
    }

    const path =
      cleanProjectFilePath(
        file.fileName ||
        file.path ||
        ""
      );

    const item = {

      ...file,

      path

    };

    state.files.push(
      item
    );

    state.fileMap[
      path
    ] = item;

    if (/\.html?$/i.test(path)) {

      state.html.push(item);

    } else if (/\.js$/i.test(path)) {

      state.js.push(item);

    } else if (/\.css$/i.test(path)) {

      state.css.push(item);

    } else if (/\.json$/i.test(path)) {

      state.json.push(item);

    } else {

      state.other.push(item);

    }

  });

  return state;

}

/* ===============================
   Export
=============================== */

window.refreshCurrentProjectFunctionDatabase =
  refreshCurrentProjectFunctionDatabase;

window.getProjectAnalyzeSources =
  getProjectAnalyzeSources;

window.getAnalyzeSourcesFromEditor =
  getAnalyzeSourcesFromEditor;

window.getAnalyzeSourcesFromCurrentProject =
  getAnalyzeSourcesFromCurrentProject;

window.getAnalyzeSourcesFromLoadedFiles =
  getAnalyzeSourcesFromLoadedFiles;

window.setCurrentProjectAnalyzeMode =
  setCurrentProjectAnalyzeMode;

window.getCurrentProjectAnalyzeMode =
  getCurrentProjectAnalyzeMode;

window.registerRepairSearchFile =
  registerRepairSearchFile;

window.clearRepairSearchFiles =
  clearRepairSearchFiles;

window.getRepairSearchFiles =
  getRepairSearchFiles;

window.getAnalyzeSourceModeLabel =
  getAnalyzeSourceModeLabel;

window.buildAnalyzeSourceSelectorHtml =
  buildAnalyzeSourceSelectorHtml;

window.changeAnalyzeSourceMode =
  changeAnalyzeSourceMode;

window.openRepairSearchFileAtLine =
  openRepairSearchFileAtLine;