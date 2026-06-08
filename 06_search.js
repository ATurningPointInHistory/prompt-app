/* ===============================
   FILE: 06_search.js
   Search / Replace
=============================== */

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
  ) return;

  editor.focus({
    preventScroll:true
  });

  editor.setSelectionRange(
    index,
    index + length
  );

  const line =
    editor.value
      .slice(0, index)
      .split("\n")
      .length;

  editor.scrollTop =
    Math.max(
      0,
      (line - 4) * 18
    );

  updateCursorPosition();
  updateLineNumbers();

  updateRepairStatus(
    `検索移動: ${repairSearchIndex + 1}/${repairSearchMatches.length}`
  );
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
  const editor = get("repairEditor");
  const findText = get("repairFindText").value;
  const replaceText = get("repairReplaceText").value;
  if (!findText) {
    alert("検索文字を入力してください");
    return;
  }
  const index = editor.value.indexOf(findText);
  if (index === -1) {
    alert("見つかりませんでした");
    return;
  }
  repairUndoStack.push(editor.value);
  editor.value =
    editor.value.slice(0, index) +
    replaceText +
    editor.value.slice(index + findText.length);
  repairLastValue = editor.value;
  updateRepairStatus("1件置換");
}

function replaceAllRepairText() {
  const editor = get("repairEditor");
  const findText = get("repairFindText").value;
  const replaceText = get("repairReplaceText").value;
  if (!findText) {
    alert("検索文字を入力してください");
    return;
  }
  const count = editor.value.split(findText).length - 1;
  if (count <= 0) {
    alert("見つかりませんでした");
    return;
  }
  repairUndoStack.push(editor.value);
  editor.value = editor.value.split(findText).join(replaceText);
  repairLastValue = editor.value;
  updateRepairStatus(`${count}件置換`);
  alert(`${count}件置換しました`);
}