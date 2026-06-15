/* ===============================
   FILE: 06_search.js
   Search / Replace
=============================== */
/* ===============================
   Global Search Cache
=============================== */

let repairSearchFileStore = {};

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
   Search File Loader
=============================== */

function loadRepairSearchFiles() {

  const input =
    document.createElement("input");

  input.type = "file";

  input.accept =
    ".js,.html,.txt,.json";

  input.multiple = true;

  input.onchange =
    function(event) {

      const files =
        Array.from(
          event.target.files || []
        );

      if (!files.length) {
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
              reader.result
            );

            loaded++;

            updateRepairStatus(
              `検索用ファイル読込 ${loaded}/${files.length}`
            );

            if (
              loaded === files.length
            ) {

              updateRepairStatus(
                `検索用ファイル ${loaded}件読込完了`
              );

            }

          };

        reader.readAsText(file);

      });

    };

  input.click();

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
  updateRepairQuickPanelVisibility();
  updateRepairSearchQuickVisibility();

  const searchPopup = get("repairSearchPopup");
  if (searchPopup && !isRepairMode()) {
    searchPopup.style.display = "none";
  }

  const replacePopup = get("repairReplacePopup");
  if (replacePopup && !isRepairMode()) {
    replacePopup.style.display = "none";
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

  repairSearchIndex = -1;

  renderRepairSearchResults(
    keyword,
    sourceText
  );

  if (repairSearchMatches.length > 0) {
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
    repairSearchIndex = -1;
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

