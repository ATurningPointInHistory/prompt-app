/* ===============================
   FILE: 06_search.js
   Search / Replace
=============================== */

/* ===============================
   Search State
=============================== */

let repairSearchIndex = 0;
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

    if (e.shiftKey) {
      searchRepairPrev();
    } else {
      searchRepairNext();
    }
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

async function searchRepairText() {
  const editor =
    get("repairEditor");

  const keyword =
    get("repairSearch")
      ?.value
      .trim();

  if (!editor || !keyword) {
    return;
  }

  const html =
    editor.value;

  const externalJs =
    await collectExternalScriptText(
      "<!DOCTYPE html>\n" +
      document.documentElement.outerHTML
    );

  const sourceText =
    html + "\n" + externalJs;

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
    matches,
    sourceText
  );

  updateRepairStatus(
    `検索結果 ${matches.length}件`
  );
}
function searchRepairPrev() {
  const editor = get("repairEditor");
  const keyword = get("repairSearch").value;

  if (!keyword) {
    alert("検索文字を入力してください");
    return;
  }

  const text = editor.value;

  let index =
    text.lastIndexOf(
      keyword,
      Math.max(
        0,
        editor.selectionStart - 1
      )
    );

  if (index === -1) {
    index = text.lastIndexOf(keyword);
  }

  if (index === -1) {
    alert("見つかりませんでした");
    return;
  }

  repairSearchIndex = index;

  editor.focus();
  editor.setSelectionRange(
    index,
    index + keyword.length
  );

  renderRepairSearchResults(keyword);
}

function searchRepairNext() {
  const editor = get("repairEditor");
  const keyword = get("repairSearch").value;

  if (!keyword) {
    alert("検索文字を入力してください");
    return;
  }

  const text = editor.value;

  let index =
    text.indexOf(
      keyword,
      repairSearchIndex
    );

  if (index === -1) {
    index = text.indexOf(keyword);
  }

  if (index === -1) {
    alert("見つかりませんでした");
    return;
  }

  repairSearchIndex =
    index + keyword.length;

  editor.focus();
  editor.setSelectionRange(
    index,
    index + keyword.length
  );

  renderRepairSearchResults(keyword);
}

function renderRepairSearchResults(
  keyword,
  matches,
  sourceText
) {

  const resultBox =
    get("repairSearchResult");

  const lines =
    sourceText.split("\n");

  const results = [];

  let currentFile =
    "repairEditor";

  lines.forEach((line, index) => {

    const fileMatch =
      line.match(
        /^\/\*\s*=====\s*(.+?)\s*=====\s*\*\/$/
      );

    if (fileMatch) {
      currentFile =
        fileMatch[1];
    }

    if (
      line.includes(keyword)
    ) {

      results.push({
        file: currentFile,
        lineNumber: index + 1,
        line
      });

    }

  });

  resultBox.style.display =
    "block";

  if (
    results.length === 0
  ) {
    resultBox.innerText =
      "検索結果：0件";
    return;
  }

  resultBox.innerHTML =
    `<b>検索結果：${results.length}件</b>` +

    results
      .slice(0, 30)
      .map(item => {

        return `
        <div
          class="search-result-line">

          <div class="small">
            [${escapeHtml(item.file)}]
            line ${item.lineNumber}
          </div>

          ${highlightKeyword(
            item.line,
            keyword
          )}

        </div>
        `;

      })
      .join("");

  if (
    results.length > 30
  ) {

    resultBox.innerHTML += `
      <div class="small">
        ※ 30件まで表示しています
      </div>
    `;
  }
}

function highlightKeyword(text, keyword) {
  const safeText = escapeHtml(text);
  const safeKeyword = escapeHtml(keyword);

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