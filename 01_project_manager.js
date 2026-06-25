
/* ===============================
   FILE: 01_project_manager.js
   共通関数
=============================== */

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

  if (
    typeof getRepairSearchFiles === "function"
  ) {

    const files =
      getRepairSearchFiles();

    if (Array.isArray(files)) {
      return files
        .map(file => ({
          fileName:
            file.fileName ||
            file.name ||
            file.path ||
            "unknown",
          code:
            file.code ||
            file.text ||
            file.content ||
            file.value ||
            ""
        }))
        .filter(source =>
          source.fileName &&
          source.code
        );
    }

  }

  return [];

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

/* ===============================
   Register Repair Search File
=============================== */

function registerRepairSearchFile(
  fileName,
  text
) {

  const path =
    cleanProjectFilePath(
      fileName
    );

  if (!path) {
    return;
  }

  repairSearchFileStore[path] = {

    fileName:
      path,

    path,

    text:
      String(text || ""),

    code:
      String(text || ""),

    updatedAt:
      Date.now()

  };

}

function clearRepairSearchFiles() {

  repairSearchFileStore =
    {};

}

/* ===============================
   Get Repair Search Files
=============================== */

function getRepairSearchFiles() {

  if (
    !repairSearchFileStore ||
    typeof repairSearchFileStore !==
      "object"
  ) {
    return [];
  }

  return Object
    .values(
      repairSearchFileStore
    )
    .map(file => {

      const path =
        cleanProjectFilePath(
          file.path ||
          file.fileName ||
          ""
        );

      return {

        ...file,

        fileName:
          path || "unknown",

        path:
          path || "unknown",

        code:
          file.code ||
          file.text ||
          ""

      };

    })
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
      class="analyze-source-mini-btn"
      onclick="${onChange}('editor')">
      ${radioMark("editor")} Editor
    </button>

    <button
      class="analyze-source-mini-btn"
      onclick="${onChange}('currentProject')">
      ${radioMark("currentProject")} Current Project
    </button>

    <button
      class="analyze-source-mini-btn"
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
    typeof renderRepairAnalyzeSourceSelector ===
      "function"
  ) {
    renderRepairAnalyzeSourceSelector();
  }

  if (
    typeof showMobileConsole ===
      "function" &&
    get("devConsoleInput")
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

/* ===============================
   Project Manager Common
   repairSearchFileStore をProject共通データとして扱う
=============================== */

/* ===============================
   Get Project File Names
=============================== */

function getProjectFileNames() {

  if (
    !repairSearchFileStore ||
    typeof repairSearchFileStore !==
      "object"
  ) {
    return [];
  }

  return Object.keys(
    repairSearchFileStore
  )
    .filter(Boolean)
    .sort();

}

/* ===============================
   Get Project File
=============================== */

function getProjectFile(
  fileName
) {

  if (
    !repairSearchFileStore ||
    typeof repairSearchFileStore !==
      "object"
  ) {
    return null;
  }

  const path =
    cleanProjectFilePath(
      fileName
    );

  return repairSearchFileStore[
    path
  ] || null;

}

/* ===============================
   Get Project Files
=============================== */

function getProjectFiles() {

  return getProjectFileNames()
    .map(fileName => {

      const file =
        getProjectFile(
          fileName
        );

      if (!file) {
        return null;
      }

      const path =
        cleanProjectFilePath(
          file.path ||
          file.fileName ||
          fileName
        );

      return {

        ...file,

        fileName:
          path,

        path,

        code:
          file.code ||
          file.text ||
          ""

      };

    })
    .filter(file =>
      file &&
      file.path
    );

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

    const path =
      cleanProjectFilePath(
        file.fileName ||
        file.path ||
        ""
      );

    if (!path) {
      return;
    }

    map[path] = {
      ...file,
      path
    };

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

    if (!file || !file.path) {
      return;
    }

    state.files.push(file);

    state.fileMap[file.path] =
      file;

    switch (
      getProjectFileCategory(
        file.path
      )
    ) {

      case "html":
        state.html.push(file);
        break;

      case "js":
        state.js.push(file);
        break;

      case "css":
        state.css.push(file);
        break;

      case "json":
        state.json.push(file);
        break;

      default:
        state.other.push(file);

    }

  });

  return state;

}

/* ===============================
   Get Project JavaScript Files
=============================== */

function getProjectJavaScriptFiles() {

  return buildProjectState()
    .js;

}

/* ===============================
   Open Repair Target
=============================== */

function openRepairTarget(
  fileName,
  line = 1
) {

  const path =
    cleanProjectFilePath(
      fileName
    );

  const file =
    getProjectFile(
      path
    );

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
      file.path ||
      file.fileName ||
      path
    );
  } else {
    currentRepairFile =
      file.path ||
      file.fileName ||
      path;
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

/* ===============================
   Load Current Project Search Files
   現在ページからHTML / JS / CSSを検索・編集対象へ登録
=============================== */

/* ===============================
   Load Current Project Search Files
=============================== */

async function loadCurrentProjectSearchFiles() {

  try {

    if (
      typeof updateRepairStatus ===
      "function"
    ) {
      updateRepairStatus(
        "現在プロジェクト読込中..."
      );
    }

    registerRepairSearchFile(
      "index.html",
      "<!DOCTYPE html>\n" +
      document.documentElement.outerHTML
    );

    let loaded = 1;
    let failed = 0;

    const failedFiles = [];

    /* ---------------------------
       JavaScript
    --------------------------- */

    const scripts =
      [
        ...document.querySelectorAll(
          "script[src]"
        )
      ];

    for (const script of scripts) {

      const src =
        script.getAttribute("src");

      if (!src) {
        continue;
      }

      const ok =
        await loadCurrentProjectFileByFetch(
          src
        );

      if (ok) {

        loaded++;

      } else {

        failed++;

        failedFiles.push(
          src
        );

      }

    }

    /* ---------------------------
       CSS
    --------------------------- */

    const styles =
      [
        ...document.querySelectorAll(
          "link[rel='stylesheet'][href]"
        )
      ];

    for (const style of styles) {

      const href =
        style.getAttribute(
          "href"
        );

      if (!href) {
        continue;
      }

      const ok =
        await loadCurrentProjectFileByFetch(
          href
        );

      if (ok) {

        loaded++;

      } else {

        failed++;

        failedFiles.push(
          href
        );

      }

    }

    /* ---------------------------
       Project Info
    --------------------------- */

    registerRepairSearchFile(
      "project_info.json",
      JSON.stringify(
        buildCurrentProjectInfo(),
        null,
        2
      )
    );

    loaded++;

    if (
      typeof updateRepairStatus ===
      "function"
    ) {
      updateRepairStatus(
        `現在プロジェクト ${loaded}件読込 / 失敗 ${failed}件`
      );
    }

    if (
      typeof buildCurrentProjectLoadReport ===
      "function"
    ) {
      alert(
        buildCurrentProjectLoadReport(
          loaded,
          failed,
          failedFiles
        )
      );
    } else {
      alert(
        `現在プロジェクト ${loaded}件読込 / 失敗 ${failed}件`
      );
    }

  } catch (e) {

    alert(
      "現在プロジェクト読込に失敗しました\n\n" +
      e.message
    );

  }

}
/* ===============================
   Load Current Project File By Fetch
   JS / CSSなど外部ファイルを取得してProjectへ登録
=============================== */

async function loadCurrentProjectFileByFetch(
  path
) {

  try {

    const res =
      await fetch(
        path
      );

    if (!res.ok) {
      return false;
    }

    const text =
      await res.text();

    registerRepairSearchFile(
      cleanProjectFilePath(path),
      text
    );

    return true;

  } catch (e) {

    console.warn(
      "現在プロジェクト読込失敗:",
      path,
      e
    );

    return false;

  }

}

/* ===============================
   Clean Project File Path
   ?v= などを除去してProject用ファイル名へ整形
=============================== */

function cleanProjectFilePath(
  path
) {

  return String(path || "")
    .split("?")[0]
    .replace(/^\.?\//, "");

}

/* ===============================
   Get HTML Health Source
=============================== */

function getHtmlHealthSource(
  mode = currentProjectAnalyzeMode
) {

  const sources =
    typeof getProjectAnalyzeSources === "function"
      ? getProjectAnalyzeSources(mode)
      : [];

  const htmlSource =
    sources.find(source =>
      source &&
      source.code &&
      (
        String(source.fileName || "")
          .toLowerCase()
          .endsWith(".html") ||
        looksLikeHtml(source.code)
      )
    );

  if (htmlSource) {
    return {
      type:
        getAnalyzeSourceModeLabel(mode),
      fileName:
        htmlSource.fileName ||
        "unknown",
      source:
        htmlSource.code
    };
  }

  return {
    type:
      "Runtime DOM",
    fileName:
      "document.documentElement",
    source:
      "<!DOCTYPE html>\n" +
      document.documentElement.outerHTML
  };

}

/* ===============================
   Build Current Project Info
   Project情報JSONを生成
=============================== */

function buildCurrentProjectInfo() {

  return {
    app: "AIプロンプト生成Pro",
    version: "v6.0",
    createdAt: new Date().toISOString(),
    files: getProjectFileNames()
  };

}

/* ===============================
   切替ボタン
=============================== */

function renderRepairAnalyzeSourceSelector() {

  const box =
    get("repairAnalyzeSourceSelector");

  if (!box) {
    return;
  }

  box.innerHTML =
    buildAnalyzeSourceSelectorHtml({
      label: "解析対象",
      onChange: "changeRepairAnalyzeSourceMode"
    });

}

async function changeRepairAnalyzeSourceMode(
  mode
) {

  await changeAnalyzeSourceMode(
    mode
  );

  renderRepairAnalyzeSourceSelector();

}

function buildRepairAnalyzeSourceToolHtml() {

  return buildAnalyzeSourceSelectorHtml({
    label: "解析対象",
    onChange: "changeAnalyzeSourceMode"
  });

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

window.getProjectFileNames =
  getProjectFileNames;

window.getProjectFile =
  getProjectFile;

window.getProjectFiles =
  getProjectFiles;

window.updateProjectFile =
  updateProjectFile;

window.getProjectFileCategory =
  getProjectFileCategory;

window.getProjectFilesByCategory =
  getProjectFilesByCategory;

window.buildProjectFileMap =
  buildProjectFileMap;

window.buildProjectState =
  buildProjectState;

window.getProjectJavaScriptFiles =
  getProjectJavaScriptFiles;

window.getProjectPackageFileText =
  getProjectPackageFileText;

window.openRepairTarget =
  openRepairTarget;

window.loadCurrentProjectSearchFiles =
  loadCurrentProjectSearchFiles;

window.loadCurrentProjectFileByFetch =
  loadCurrentProjectFileByFetch;

window.cleanProjectFilePath =
  cleanProjectFilePath;

window.buildCurrentProjectInfo =
  buildCurrentProjectInfo;

window.getHtmlHealthSource =
  getHtmlHealthSource;

window.renderRepairAnalyzeSourceSelector =
  renderRepairAnalyzeSourceSelector;

window.changeRepairAnalyzeSourceMode =
  changeRepairAnalyzeSourceMode;

window.buildRepairAnalyzeSourceToolHtml =
  buildRepairAnalyzeSourceToolHtml;