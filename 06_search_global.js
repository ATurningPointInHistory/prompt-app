/* ===============================
   FILE: 06_search_global.js
   全ファイル検索 ※次工程で実装
=============================== */

/* ===============================
   Global Search Cache
=============================== */

let repairLastGlobalSearchKeyword = "";

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

function openGlobalSearchResult(index) {

  saveCurrentSearchEditorFile();

  const item =
    repairGlobalSearchResults[index];

  if (!item) {
    return;
  }

  if (
    typeof recordMacroAction ===
    "function"
  ) {
    recordMacroAction(
      "openGlobalSearchResult",
      {
        fileName:
          item.fileName,

        lineNumber:
          item.lineNumber,

        index
      }
    );
  }

  if (
    !openRepairTarget(
      item.fileName,
      item.lineNumber
    )
  ) {
    return;
  }

  const searchBox =
    get("repairSearch");

  if (searchBox) {

    searchBox.value =
      repairLastGlobalSearchKeyword || "";

  }

  closeGlobalSearchModal();

  if (
    typeof updateRepairStatus ===
    "function"
  ) {
    updateRepairStatus(
      `${item.fileName} / L${item.lineNumber}へ移動`
    );
  }

  saveSearchHistory(
    item.fileName,
    item.lineNumber,
    repairLastGlobalSearchKeyword
  );

}

function saveCurrentSearchEditorFile() {

  const editor =
    get("repairEditor");

  if (!editor) {
    return;
  }

  const fileName =
    currentRepairFile ||
    "current_editor.js";

  registerRepairSearchFile(
    fileName,
    editor.value
  );

}

/* ===============================
   Show Repair Search Files
=============================== */

function showRepairSearchFiles() {

  const names =
    getProjectFileNames();

  if (!names.length) {

    alert(
      "検索用ファイル未読込"
    );

    return;
  }

  alert(
    [
      `読込済み: ${names.length}件`,
      "",
      ...names
    ].join("\n")
  );

}

function loadRepairSearchFiles() {

  const input =
    document.createElement("input");

  input.type = "file";
  input.accept = ".js,.html,.txt,.json";
  input.multiple = true;

  input.onchange =
    function(event) {

      const files =
        Array.from(
          event.target.files || []
        );

      if (!files.length) {
        alert("ファイルが選択されていません");
        return;
      }

      let loaded = 0;

      files.forEach(file => {

        const reader =
          new FileReader();

        reader.onload =
          function() {

            registerRepairSearchFile(
              file.name,
              reader.result || ""
            );

            loaded++;

            console.log(
              "検索用ファイル読込:",
              file.name,
              loaded,
              "/",
              files.length
            );

            if (
              typeof updateRepairStatus === "function"
            ) {
              updateRepairStatus(
                `検索用ファイル読込 ${loaded}/${files.length}`
              );
            }

            if (loaded === files.length) {

              const message =
                `検索用ファイル ${loaded}件読込完了`;

              console.log(message);
              alert(message);

              if (
                typeof updateRepairStatus === "function"
              ) {
                updateRepairStatus(message);
              }
            }
          };

        reader.onerror =
          function() {
            console.error(
              "ファイル読込失敗:",
              file.name
            );
          };

        reader.readAsText(file);

      });

    };

  input.click();
}

/* ===============================
   Global Search
=============================== */

let repairGlobalSearchResults = [];

function searchAllRepairFiles() {

  const keyword =
    get("repairSearch")
      ?.value
      .trim();

  if (!keyword) {
    alert("検索文字を入力してください");
    return;
  }

  if (typeof recordMacroAction === "function") {
    recordMacroAction(
      "searchAllRepairFiles",
      {
        keyword
      }
    );
  }

  repairLastGlobalSearchKeyword =
    keyword;

  const state =
    buildProjectState();

  const files =
    state.files;

  if (!files.length) {
    alert("検索用ファイルが未読込です");
    return;
  }

  const results = [];

  files.forEach(file => {

    const fileName =
      file.path ||
      file.fileName ||
      "unknown";

    const lines =
      String(
        file.text ||
        file.code ||
        ""
      ).split("\n");

    lines.forEach((line, index) => {

      if (
        !line
          .toLowerCase()
          .includes(
            keyword.toLowerCase()
          )
      ) {
        return;
      }

      results.push({

        fileName,

        lineNumber:
          index + 1,

        line,

        before2:
          lines[index - 2] || "",

        before1:
          lines[index - 1] || "",

        after1:
          lines[index + 1] || "",

        after2:
          lines[index + 2] || ""

      });

    });

  });

  repairGlobalSearchResults =
    results;

  console.log(
    "Global Search Results",
    repairGlobalSearchResults
  );

  if (
    typeof updateRepairStatus ===
    "function"
  ) {
    updateRepairStatus(
      `全検索結果 ${results.length}件`
    );
  }

  showGlobalSearchModal();

}

function showGlobalSearchModal() {

  ensureGlobalSearchModal();

  renderGlobalSearchModal();

  const modal =
    get("globalSearchModal");

  if (modal) {
    modal.style.display = "flex";
  }

}

function closeGlobalSearchModal() {

  const modal =
    get("globalSearchModal");

  if (modal) {
    modal.style.display = "none";
  }

}

function ensureGlobalSearchModal() {

  if (get("globalSearchModal")) {
    return;
  }

  const modal =
    document.createElement("div");

  modal.id =
    "globalSearchModal";

  modal.innerHTML = `
    <div class="global-search-box">

      <div class="global-search-header">
        <b>全検索結果</b>
        <button onclick="closeGlobalSearchModal()">×</button>
      </div>

      <div
        id="globalSearchResultBody"
        class="global-search-body">
      </div>

    </div>
  `;

  document.body.appendChild(modal);

}

function renderGlobalSearchModal() {

  const body =
    get("globalSearchResultBody");

  if (!body) {
    return;
  }

  const total =
    repairGlobalSearchResults.length;

  const list =
    repairGlobalSearchResults
      .slice(0, 30);

  if (!total) {
    body.innerHTML =
      `<div class="small">検索結果なし</div>`;
    return;
  }

  let html =
    `<div class="small">
      検索結果 ${total}件
      ${
        total > 30
          ? "<br>表示件数 30件まで"
          : ""
      }
    </div><br>`;

  html +=
    list.map((item, index) => {

      return `
        <div
          class="global-search-item"
          onclick="openGlobalSearchResult(${index})">

          <div class="global-search-file">
            [${escapeHtml(item.fileName)}] L${item.lineNumber}
          </div>

          <div>
            <span class="global-search-line-no">L${item.lineNumber - 2}</span>
            ${escapeHtml(item.before2)}
          </div>

          <div>
            <span class="global-search-line-no">L${item.lineNumber - 1}</span>
            ${escapeHtml(item.before1)}
          </div>

          <div class="global-search-hit">
            <span class="global-search-line-no">L${item.lineNumber}</span>
            ${escapeHtml(item.line)}
          </div>

          <div>
            <span class="global-search-line-no">L${item.lineNumber + 1}</span>
            ${escapeHtml(item.after1)}
          </div>

          <div>
            <span class="global-search-line-no">L${item.lineNumber + 2}</span>
            ${escapeHtml(item.after2)}
          </div>

        </div>
      `;

    })
    .join("");

  body.innerHTML =
    html;

}

function calcLineNumberFromIndex(
  text,
  index
) {

  if (
    !text ||
    index <= 0
  ) {
    return 1;
  }

  return text
    .slice(0, index)
    .split(/\r?\n/)
    .length;

}