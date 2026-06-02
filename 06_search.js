/* ===============================
   FILE: 06_search.js
   Search / Replace
=============================== */

/* ===============================
   Search State
=============================== */

let repairSearchIndex = 0;
let repairSearchMatches = [];
let repairSearchKeyword = "";
let repairSearchSourceText = "";

/* ===============================
   Search Panel
=============================== */

function toggleRepairSearchBox() {

  openFloatPanel(
    "検索",
    `
    <div class="float-panel-actions">
      <button onclick="toggleRepairSearchInput()">🔎入力</button>
      <button onclick="this.blur();searchRepairPrev()">◀</button>
      <button onclick="this.blur();searchRepairNext()">▶</button>
      <button onclick="this.blur();clearRepairSearch()">✕</button>
    </div>

    <div
      id="repairSearchInputRow"
      class="search-input-row">
      <input
        id="repairSearch"
        placeholder="検索">
    </div>

    <div
      id="repairSearchResult"
      class="diagnose-box"
      style="display:none;">
    </div>
    `
  );
}

function toggleRepairSearchInput() {
  const row =
    get("repairSearchInputRow");

  const box =
    get("repairSearch");

  if (!row || !box) return;

  row.classList.toggle("open");

  if (row.classList.contains("open")) {
    setTimeout(() => {
      box.focus();
      box.select();
      box.onkeydown =
        handleRepairSearchKey;
    }, 50);
  } else {
    box.blur();
  }
}

function handleRepairSearchKey(e) {
  if (e.key === "Enter") {
    e.preventDefault();

    if (e.shiftKey) {
      searchRepairPrev();
    } else {
      searchRepairText();
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

function toggleRepairSearchInput() {
  const row = get("repairSearchInputRow");
  const box = get("repairSearch");

  if (!row || !box) return;

  row.classList.toggle("open");

  if (row.classList.contains("open")) {
    setTimeout(() => {
      box.focus();
      box.select();
      box.onkeydown = handleRepairSearchKey;
    }, 50);
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

  const resultBox =
      get("repairSearchResult");

    if (resultBox) {
      resultBox.style.display = "block";
      resultBox.scrollIntoView({
        block: "nearest"
      });
    }

  console.log(
    "repair search",
    keyword,
    matches.length
  );

  updateRepairStatus(
    `検索結果 ${matches.length}件`
  );
}

function searchRepairPrev() {
  const editor =
    get("repairEditor");

  const keyword =
    get("repairSearch")
      ?.value;

  if (!editor || !keyword) {
    alert("検索文字を入力してください");
    return;
  }

  const text =
    editor.value;

  let index =
    text.lastIndexOf(
      keyword,
      Math.max(
        0,
        editor.selectionStart - 1
      )
    );

  if (index === -1) {
    index =
      text.lastIndexOf(keyword);
  }

  if (index === -1) {
    alert("修復エディタ内では見つかりませんでした");
    return;
  }

  repairSearchIndex =
    index;

  editor.setSelectionRange(
    index,
    index + keyword.length
  );

  if (
    repairSearchKeyword &&
    repairSearchSourceText
  ) {
    renderRepairSearchResults(
      repairSearchKeyword,
      [],
      repairSearchSourceText
    );
  }

  const box =
    get("repairSearch");

  if (box) {
    box.blur();
  }

  updateCursorPosition();
  updateLineNumbers();
}

function searchRepairNext() {
  const editor =
    get("repairEditor");

  const keyword =
    get("repairSearch")
      ?.value;

  if (!editor || !keyword) {
    alert("検索文字を入力してください");
    return;
  }

  const text =
    editor.value;

  let index =
    text.indexOf(
      keyword,
      repairSearchIndex
    );

  if (index === -1) {
    index =
      text.indexOf(keyword);
  }

  if (index === -1) {
    alert("修復エディタ内では見つかりませんでした");
    return;
  }

  repairSearchIndex =
    index + keyword.length;

  editor.setSelectionRange(
    index,
    index + keyword.length
  );

  if (
    repairSearchKeyword &&
    repairSearchSourceText
  ) {
    renderRepairSearchResults(
      repairSearchKeyword,
      [],
      repairSearchSourceText
    );
  }

  const box =
    get("repairSearch");

  if (box) {
    box.blur();
  }

  updateCursorPosition();
  updateLineNumbers();
}

function renderRepairSearchResults(
  keyword,
  matches,
  sourceText
) {
  const resultBox =
    get("repairSearchResult");

  if (!resultBox) return;

  const safeText =
    String(sourceText || "");

  const safeKeyword =
    String(keyword || "");

  const lines =
    safeText.split("\n");

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
      return;
    }

    if (
      safeKeyword &&
      line.includes(safeKeyword)
    ) {
      results.push({
        file: currentFile,
        lineNumber: index + 1,
        line
      });
    }
  });

  resultBox.style.display = "block";
  resultBox.style.maxHeight = "45vh";
  resultBox.style.overflowY = "auto";
  resultBox.style.marginTop = "10px";

  if (results.length === 0) {
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
        <div class="search-result-line">
          <div class="small">
            [${escapeHtml(item.file)}]
            line ${item.lineNumber}
          </div>
          ${highlightKeyword(
            item.line,
            safeKeyword
          )}
        </div>
        `;
      })
      .join("");

  if (results.length > 30) {
    resultBox.innerHTML += `
      <div class="small">
        ※ 30件まで表示しています
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
