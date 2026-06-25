/* ===============================
   FILE: 06_search_global.js
   全ファイル検索 ※次工程で実装
=============================== */

/* ===============================
   Global Search Cache
=============================== */

let repairLastGlobalSearchKeyword = "";

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

  if (
    typeof saveSearchHistory ===
    "function"
  ) {
    saveSearchHistory(
      item.fileName,
      item.lineNumber,
      repairLastGlobalSearchKeyword
    );
  }

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