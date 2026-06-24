/* ===============================
   FILE: 06_search_core.js
   検索状態・検索実行・移動
=============================== */

/* ===============================
   Search State
=============================== */

let repairSearchIndex = -1;
let repairSearchMatches = [];

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

  if (
    typeof updateRepairStatus ===
    "function"
  ) {
    updateRepairStatus(
      `検索結果 ${matches.length}件`
    );
  }

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
