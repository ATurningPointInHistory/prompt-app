/* ===============================
   FILE: 06_search.js
   Search / Replace
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

/* ===============================
   Load Current Project Search Files
   現在ページからHTML / JS / CSSを検索・編集対象へ登録
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
      }

    }

    const styles =
      [
        ...document.querySelectorAll(
          "link[rel='stylesheet'][href]"
        )
      ];

    for (const link of styles) {

      const href =
        link.getAttribute("href");

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
      }

    }

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

    alert(
      `現在プロジェクト ${loaded}件を検索対象に登録しました\n\n` +
      `失敗: ${failed}件`
    );

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

function saveSearchHistory(
  file,
  line,
  keyword
) {

  repairSearchHistory.unshift({

    file,
    line,
    keyword,
    time:
      Date.now()

  });

  if (
    repairSearchHistory.length > 50
  ) {
    repairSearchHistory.length =
      50;
  }

  localStorage.setItem(
    "repairSearchHistory",
    JSON.stringify(
      repairSearchHistory
    )
  );

}

function showSearchHistory() {

  if (!repairSearchHistory.length) {
    alert("履歴なし");
    return;
  }

  openFloatPanel(
    "検索履歴",
    repairSearchHistory
      .map(item => `
<div
  class="function-item"
  onclick='jumpToSearchHistory(
    ${JSON.stringify(item.file)},
    ${Number(item.line) || 1}
  )'>
📄 ${escapeHtml(item.file)}
<br>
L${item.line}
<br>
${escapeHtml(item.keyword)}
</div>
`)
      .join("")
  );

}

function jumpToSearchHistory(
  fileName,
  line
) {

  if (
    !openRepairTarget(
      fileName,
      line
    )
  ) {
    return;
  }

  closeFloatPanel();

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

function loadSearchHistory() {

  try {

    repairSearchHistory =
      JSON.parse(
        localStorage.getItem(
          "repairSearchHistory"
        ) || "[]"
      );

  } catch {

    repairSearchHistory = [];

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

function showRepairSearchFiles() {

  const names =
    Object.keys(
      repairSearchFileStore
    );

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

  const fileNames =
    Object.keys(
      repairSearchFileStore
    );

  if (!fileNames.length) {
    alert("検索用ファイルが未読込です");
    return;
  }

  const results = [];

  fileNames.forEach(fileName => {

    const file =
      repairSearchFileStore[fileName];

    const lines =
      String(file.text || "")
        .split("\n");

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

  updateRepairStatus(
    `全検索結果 ${results.length}件`
  );

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
            ★ ${escapeHtml(item.line)}
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

/* ===============================
   Search State
=============================== */

let repairSearchIndex = -1;
let repairSearchMatches = [];

/* ===============================
   Search Panel
=============================== */

function toggleRepairSearchBox() {
  openFloatPanel(
    "検索",
    `
    <input
      id="repairSearch"
      placeholder="検索">

    <div class="float-panel-actions">
      <button onclick="searchRepairText()">🔍</button>
      <button onclick="searchRepairPrev()">◀</button>
      <button onclick="searchRepairNext()">▶</button>
      <button onclick="clearRepairSearch()">✕</button>
    </div>

    <div
      id="repairSearchResult"
      class="diagnose-box"
      style="display:none;">
    </div>
    `
  );

  setTimeout(() => {
    const box = get("repairSearch");
    if (!box) return;

    box.focus();
    box.select();
    box.onkeydown = handleRepairSearchKey;
  }, 50);
}

function handleRepairSearchKey(e) {
  if (e.key === "Enter") {
    e.preventDefault();

    searchRepairText();
  }

  if (e.key === "Escape") {
    e.preventDefault();

    if (
      typeof closeFloatPanelKeepEditorSelection ===
      "function"
    ) {
      closeFloatPanelKeepEditorSelection();
    } else {
      closeFloatPanel();
    }
  }
}

function clearRepairSearch() {
  const box = get("repairSearch");
  if (!box) return;

  box.value = "";

  repairSearchIndex = -1;
  repairSearchMatches = [];

  const result =
    get("repairSearchResult");

  if (result) {
    result.innerHTML = "";
    result.style.display = "none";
  }

  box.focus();
}

function updateRepairFloatingPanelsVisibility() {

  if (typeof updateRepairQuickPanelVisibility === "function") {
    updateRepairQuickPanelVisibility();
  }

  if (typeof updateRepairSearchQuickVisibility === "function") {
    updateRepairSearchQuickVisibility();
  }

  const searchPopup =
    get("repairSearchPopup");

  if (searchPopup && !isRepairMode()) {
    searchPopup.style.display =
      "none";
  }

  const replacePopup =
    get("repairReplacePopup");

  if (replacePopup && !isRepairMode()) {
    replacePopup.style.display =
      "none";
  }
}

/* ===============================
   Search Action
=============================== */

function searchRepairText() {

  const editor =
    get("repairEditor");

  const keyword =
    get("repairSearch")
      ?.value
      .trim();

  if (!editor || !keyword) {
    return;
  }

  if (
    typeof recordMacroAction ===
    "function"
  ) {
    recordMacroAction(
      "searchRepairText",
      {
        keyword
      }
    );
  }

  const sourceText =
    editor.value;

  const regex =
    new RegExp(
      escapeRegExp(keyword),
      "gi"
    );

  const matches =
    [...sourceText.matchAll(regex)];

  repairSearchMatches =
    matches.map(m => m.index);

  repairSearchIndex =
    -1;

  renderRepairSearchResults(
    keyword,
    sourceText
  );

  if (
    repairSearchMatches.length > 0
  ) {
    searchRepairNext();
  }

  updateRepairStatus(
    `検索結果 ${matches.length}件`
  );

}

function searchRepairPrev() {

  const keyword =
    get("repairSearch")
      ?.value
      ?.trim();

  if (!keyword) {
    alert("検索文字を入力してください");
    return;
  }

  if (
    !Array.isArray(
      repairSearchMatches
    )
  ) {
    repairSearchMatches = [];
  }

  if (
    repairSearchMatches.length === 0
  ) {
    searchRepairText();
    return;
  }

  repairSearchIndex--;

  if (repairSearchIndex < 0) {
    repairSearchIndex =
      repairSearchMatches.length - 1;
  }

  moveRepairSearchSelection(
    repairSearchMatches[
      repairSearchIndex
    ],
    keyword.length
  );
}

function searchRepairNext() {

  const keyword =
    get("repairSearch")
      ?.value
      ?.trim();

  if (!keyword) {
    alert("検索文字を入力してください");
    return;
  }

  if (
    !Array.isArray(
      repairSearchMatches
    )
  ) {
    repairSearchMatches = [];
  }

  if (
    repairSearchMatches.length === 0
  ) {
    searchRepairText();
    return;
  }

  repairSearchIndex++;

  if (
    repairSearchIndex >=
    repairSearchMatches.length
  ) {
    repairSearchIndex = 0;
  }

  moveRepairSearchSelection(
    repairSearchMatches[
      repairSearchIndex
    ],
    keyword.length
  );
}

function moveRepairSearchSelection(index, length) {
  const editor =
    get("repairEditor");

  if (
    !editor ||
    index === undefined ||
    index === null
  ) {
    return;
  }

  editor.focus();

  editor.setSelectionRange(
    index,
    index + length
  );

  // カーソル位置を画面内へ確実に表示
  editor.blur();
  editor.focus();

  const before =
    editor.value.slice(0, index);

  const line =
    before.split("\n").length;

  const lineHeight =
    parseFloat(
      getComputedStyle(editor).lineHeight
    ) || 18;

  const targetTop =
    Math.max(
      0,
      (line - 6) * lineHeight
    );

  editor.scrollTop =
    targetTop;

  if (typeof updateCursorPosition === "function") {
    updateCursorPosition();
  }

  if (typeof updateLineNumbers === "function") {
    updateLineNumbers();
  }

  if (typeof updateRepairStatus === "function") {
    updateRepairStatus(
      `検索移動: ${repairSearchIndex + 1}/${repairSearchMatches.length}`
    );
  }
}

function renderRepairSearchResults(
  keyword,
  sourceText
) {

  const resultBox =
    get("repairSearchPopupResult") ||
    get("repairSearchResult");

  if (!resultBox) return;

  const safeText =
    String(sourceText || "");

  const safeKeyword =
    String(keyword || "");

  const lines =
    safeText.split("\n");

  const results = [];

  lines.forEach((line,index)=>{

    if(
      safeKeyword &&
      line.includes(safeKeyword)
    ){

      results.push({
        lineNumber:
          index+1,
        line
      });

    }

  });

  resultBox.style.display =
    "block";

  if(results.length===0){

    resultBox.innerText =
      "検索結果：0件";

    return;
  }

  resultBox.innerHTML =

    `<b>検索結果：${results.length}件</b>`

    +

    results
      .slice(0,30)
      .map(item=>{

        return `

        <div
          class="search-result-line"

          onclick="
            jumpToLine(
              ${item.lineNumber}
            )
          "

          title="
            line
            ${item.lineNumber}
          ">

          [L${item.lineNumber}]

          ${highlightKeyword(
            item.line,
            safeKeyword
          )}

        </div>

        `;

      })
      .join("");

  if(results.length>30){

    resultBox.innerHTML +=

    `
    <div class="small">
      ※30件まで表示
    </div>
    `;
  }

}

function highlightKeyword(text, keyword) {
  const safeText =
    escapeHtml(text);

  const safeKeyword =
    escapeHtml(keyword);

  const regex =
    new RegExp(
      escapeRegExp(safeKeyword),
      "gi"
    );

  return safeText.replace(
    regex,
    match => `<mark>${match}</mark>`
  );
}

/* ===============================
   Replace Panel / Action
=============================== */

function openReplacePanel() {
  openFloatPanel(
    "検索置換",
    `
    <input id="repairFindText" placeholder="検索文字">
    <input id="repairReplaceText" placeholder="置換後文字">
    <div class="float-panel-actions">
      <button onclick="replaceRepairText()">置換</button>
      <button onclick="replaceAllRepairText()">全置換</button>
    </div>
    `
  );
}

function replaceRepairText() {

  const editor =
    get("repairEditor");

  const findBox =
    get("repairFindText") ||
    get("replaceFrom");

  const replaceBox =
    get("repairReplaceText") ||
    get("replaceTo");

  if (!editor || !findBox || !replaceBox) {
    alert("置換UIが見つかりません");
    return;
  }

  const findText =
    findBox.value;

  const replaceText =
    replaceBox.value;

  if (!findText) {
    alert("検索文字を入力してください");
    return;
  }

  const index =
    editor.value.indexOf(findText);

  if (index === -1) {
    alert("見つかりませんでした");
    return;
  }

  repairUndoStack.push(
    editor.value
  );

  repairRedoStack = [];

  editor.value =
    editor.value.slice(0, index) +
    replaceText +
    editor.value.slice(
      index + findText.length
    );

  repairLastValue =
    editor.value;

  if (typeof updateLineNumbers === "function") {
    updateLineNumbers();
  }

  if (typeof updateCursorPosition === "function") {
    updateCursorPosition();
  }

  if (typeof autoSaveRepairDraft === "function") {
    autoSaveRepairDraft();
  }

  if (typeof updateRepairStatus === "function") {
    updateRepairStatus("1件置換");
  }
}

function replaceAllRepairText() {

  const editor =
    get("repairEditor");

  const findBox =
    get("repairFindText") ||
    get("replaceFrom");

  const replaceBox =
    get("repairReplaceText") ||
    get("replaceTo");

  if (!editor || !findBox || !replaceBox) {
    alert("置換UIが見つかりません");
    return;
  }

  const findText =
    findBox.value;

  const replaceText =
    replaceBox.value;

  if (!findText) {
    alert("検索文字を入力してください");
    return;
  }

  const count =
    editor.value.split(findText).length - 1;

  if (count <= 0) {
    alert("見つかりませんでした");
    return;
  }

  repairUndoStack.push(
    editor.value
  );

  repairRedoStack = [];

  editor.value =
    editor.value
      .split(findText)
      .join(replaceText);

  repairLastValue =
    editor.value;

  if (typeof updateLineNumbers === "function") {
    updateLineNumbers();
  }

  if (typeof updateCursorPosition === "function") {
    updateCursorPosition();
  }

  if (typeof autoSaveRepairDraft === "function") {
    autoSaveRepairDraft();
  }

  if (typeof updateRepairStatus === "function") {
    updateRepairStatus(
      `${count}件置換`
    );
  }

  alert(`${count}件置換しました`);
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