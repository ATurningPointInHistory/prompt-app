/* ===============================
   FILE: 06_search_ui.js
   検索パネル・結果表示・ハイライト
=============================== */

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

function updateRepairFloatingPanelsVisibility() {

  if (
    typeof updateRepairQuickPanelVisibility ===
    "function"
  ) {
    updateRepairQuickPanelVisibility();
  }

  if (
    typeof updateRepairSearchQuickVisibility ===
    "function"
  ) {
    updateRepairSearchQuickVisibility();
  }

  const repairMode =
    typeof isRepairMode === "function"
      ? isRepairMode()
      : true;

  const searchPopup =
    get("repairSearchPopup");

  if (searchPopup && !repairMode) {
    searchPopup.style.display =
      "none";
  }

  const replacePopup =
    get("repairReplacePopup");

  if (replacePopup && !repairMode) {
    replacePopup.style.display =
      "none";
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
      line
        .toLowerCase()
        .includes(
          safeKeyword.toLowerCase()
        )
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


