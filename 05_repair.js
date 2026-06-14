/* ===============================
   FILE: 05_repair.js
   Repair IDE
=============================== */

/* ===============================
   Repair State
=============================== */

let repairUndoStack = [];
let repairRedoStack = [];
let repairLastValue = "";
let repairAutoSaveEnabled = false;
let currentRepairFile = "";
let functionSortList = [];
let functionSortFilter = "all";
let dragSortIndex = null;
let pinnedLine = null;
let repairOriginalHtml = "";

/* ===============================
   Repair View / Preview
=============================== */

function toggleFunctionView(index) {

  const el =
    get(
      "functionView" + index
    );

  if (!el) {
    return;
  }

  el.style.display =
    el.style.display === "block"
      ? "none"
      : "block";
}

function openViewerMode() {

  const preview =
    get("repairPreview");

  const viewer =
    get("functionViewer");

  if (!viewer) {
    return;
  }

  // 表示中なら閉じる

  if (
    viewer.style.display === "block"
  ) {

    viewer.style.display =
      "none";

    updateRepairStatus(
      "閲覧モード終了"
    );

    return;
  }

  // 開く

  if (preview) {
    preview.style.display =
      "none";
  }

  renderFunctionViewer();

  viewer.style.display =
    "block";

  updateRepairStatus(
    "閲覧モード：関数ビュー表示"
  );

}

function previewRepairHtml() {

  const box =
    get("repairPreview");

  const btn =
    get("previewBtn");

  if (!box) {
    return;
  }

  if (box.style.display === "block") {

    box.style.display =
      "none";

    if (btn) {
      btn.innerText =
        "🎨 色分けプレビュー";
    }

    return;
  }

  const html =
    get("repairEditor").value;

  if (!html.trim()) {
    alert("HTMLが空です");
    return;
  }

  let escaped =
    escapeHtml(html);

  escaped = escaped
    .replace(
      /(&lt;!--[\s\S]*?--&gt;)/g,
      '<span class="code-comment">$1</span>'
    )
    .replace(
      /(&lt;\/?)([a-zA-Z0-9-]+)/g,
      '$1<span class="code-tag">$2</span>'
    )
    .replace(
      /\s([a-zA-Z-:]+)=/g,
      ' <span class="code-attr">$1</span>='
    )
    .replace(
      /(&quot;.*?&quot;)/g,
      '<span class="code-string">$1</span>'
    )
    .replace(
      /\b(function|const|let|var|return|if|else|try|catch|for|while|switch|case|break|new)\b/g,
      '<span class="code-keyword">$1</span>'
    );

  box.innerHTML =
    escaped;

  box.style.display =
    "block";

  if (btn) {
    btn.innerText =
      "❌ プレビュー閉じる";
  }
}

function saveDeleteRollbackSnapshot(
  label = ""
) {

  const editor =
    get("repairEditor");

  if (!editor) {
    return;
  }

  lastDeleteRollbackHtml =
    editor.value;

  lastDeleteRollbackInfo =
    label;

  localStorage.setItem(
    "lastDeleteRollbackHtml",
    lastDeleteRollbackHtml
  );

  localStorage.setItem(
    "lastDeleteRollbackInfo",
    lastDeleteRollbackInfo
  );

}

async function rollbackLastDelete(skipConfirm = false) {

  const editor =
    get("repairEditor");

  if (!editor) {
    return;
  }

  const backup =
    lastDeleteRollbackHtml ||
    localStorage.getItem(
      "lastDeleteRollbackHtml"
    );

  if (!backup) {
    alert("ロールバックデータなし");
    return;
  }

  if (
    !skipConfirm &&
    !confirm("削除前へ戻しますか？")
  ) {
    return;
  }

  editor.value =
    backup;

  repairLastValue =
    backup;

  if (typeof updateLineNumbers === "function") {
    updateLineNumbers();
  }

  if (typeof updateCursorPosition === "function") {
    updateCursorPosition();
  }

  if (typeof showHtmlHealth === "function") {
    await showHtmlHealth();
  }

  if (typeof updateRepairStatus === "function") {
    updateRepairStatus(
      "ロールバック完了"
    );
  }
}























function scrollRepairTop() {

  const editor =
    get("repairEditor");

  if (!editor) {
    return;
  }

  editor.focus();

  editor.scrollTop = 0;

  editor.setSelectionRange(
    0,
    0
  );

  updateCursorPosition();

  updateRepairStatus(
    "最上部へ移動"
  );

}

/* ===============================
   Repair Navigation
=============================== */

function scrollRepairBottom() {

  const editor =
    get("repairEditor");

  if (!editor) {
    return;
  }

  const len =
    editor.value.length;

  editor.focus();

  editor.scrollTop =
    editor.scrollHeight;

  editor.setSelectionRange(
    len,
    len
  );

  updateCursorPosition();

  updateRepairStatus(
    "最下部へ移動"
  );

}

/* ===============================
   Repair Editor Core
=============================== */

function applyRepairIndent(isOutdent) {
  const editor = get("repairEditor");
  if (!editor) return;
  const value = editor.value;
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const indent = "  ";
  repairUndoStack.push(value);
  repairRedoStack = [];
  // 単一カーソルでTabの場合
  if (start === end && !isOutdent) {
    editor.value =
      value.slice(0, start) +
      indent +
      value.slice(end);
    const pos = start + indent.length;
    editor.selectionStart = pos;
    editor.selectionEnd = pos;
  } else {
    const lineStart =
      value.lastIndexOf("\n", start - 1) + 1;
    const before = value.slice(0, lineStart);
    const target = value.slice(lineStart, end);
    const after = value.slice(end);
    const lines = target.split("\n");
    const changed = isOutdent
      ? lines.map(line => {
          if (line.startsWith(indent)) return line.slice(indent.length);
          if (line.startsWith(" ")) return line.slice(1);
          return line;
        }).join("\n")
      : lines.map(line => indent + line).join("\n");
    editor.value = before + changed + after;
    const delta =
      editor.value.length - value.length;
    editor.selectionStart = start;
    editor.selectionEnd = end + delta;
  }
  editor.focus();
  repairLastValue = editor.value;
  updateLineNumbers();
  updateCursorPosition();
  updateRepairStatus(isOutdent ? "アウトデント" : "インデント");
  autoSaveRepairDraft();
}

function indentRepairSelection() {
  applyRepairIndent(false);
}

function outdentRepairSelection() {
  applyRepairIndent(true);
}

function enableRepairEditorTabIndent() {
  const editor = get("repairEditor");
  if (!editor) return;

  editor.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;

    e.preventDefault();

    if (e.shiftKey) {
      outdentRepairSelection();
      return;
    }

    indentRepairSelection();
  });
}

function updateLineNumbers() {

  const editor =
    get("repairEditor");

  const lineBox =
    get("lineNumbers");

  if (!editor || !lineBox) return;

  const currentLine =
    editor.value
      .slice(
        0,
        editor.selectionStart
      )
      .split("\n")
      .length;

  const count =
    editor.value
      .split("\n")
      .length || 1;

  lineBox.innerHTML =
    Array.from(
      { length: count },
      (_, i) => {

        const lineNo =
          i + 1;

        let cls =
          "line-number";

        if (
          lineNo === currentLine
        ){
          cls += " active";
        }

        if (
          lineNo === pinnedLine
        ){
          cls += " pinned";
        }

        return `
<div
  class="${cls}"
  onclick="
    togglePinnedLine(
      ${lineNo}
    )
  "
>
${lineNo}
</div>
`;
      }).join("");
}

function updateRepairStatus(text) {
  const box = get("repairStatus");
  if (!box) return;
  box.innerText = "状態：" + text;
}

function undoRepairEdit() {

  const editor =
    get("repairEditor");

  if (
    !editor ||
    repairUndoStack.length===0
  ) return;

  repairRedoStack.push(
    editor.value
  );

  editor.value =
    repairUndoStack.pop();

  repairLastValue =
    editor.value;

  updateLineNumbers();
  updateCursorPosition();

  autoSaveRepairDraft();

  updateRepairStatus(
    "Undo実行"
  );
}

function redoRepairEdit() {

  const editor =
    get("repairEditor");

  if (
    !editor ||
    repairRedoStack.length===0
  ) return;

  repairUndoStack.push(
    editor.value
  );

  editor.value =
    repairRedoStack.pop();

  repairLastValue =
    editor.value;

  updateLineNumbers();
  updateCursorPosition();

  autoSaveRepairDraft();

  updateRepairStatus(
    "Redo実行"
  );
}

function loadRepairDraft() {
  repairAutoSaveEnabled =
    localStorage.getItem("repairAutoSaveEnabled") === "1";

  currentRepairFile =
    localStorage.getItem("repairCurrentFile") || "";

  updateRepairStatus(
    repairAutoSaveEnabled
      ? "AutoSave ON"
      : "AutoSave OFF"
  );

  const draft = localStorage.getItem("repairDraftHtml");
  if (!draft) return;
  const ok = confirm("修復モードの自動保存データを復元しますか？");
  if (!ok) return;
  get("repairEditor").value = draft;
  repairLastValue = draft;
  updateRepairStatus("自動保存データ復元");
}

function updateCursorPosition() {
  const editor = get("repairEditor");
  const box = get("cursorStatus");
  if (!editor || !box) return;
  const pos = editor.selectionStart || 0;
  const before = editor.value.slice(0, pos);
  const line = before.split("\n").length;
  const col =
    before.length -
    before.lastIndexOf("\n");
  box.innerText =
    `Ln ${line} / Col ${col}`;
  updateLineNumbers();
}

function toggleRepairAutoSave() {
  repairAutoSaveEnabled = !repairAutoSaveEnabled;
  localStorage.setItem(
    "repairAutoSaveEnabled",
    repairAutoSaveEnabled ? "1" : "0"
  );
  updateRepairStatus(
    repairAutoSaveEnabled ? "AutoSave ON" : "AutoSave OFF"
  );
}

function autoSaveRepairDraft() {
  if (!repairAutoSaveEnabled) return;
  const editor = get("repairEditor");
  if (!editor) return;
  localStorage.setItem("repairDraftHtml", editor.value);
  localStorage.setItem(
    "repairDraftSavedAt",
    new Date().toISOString()
  );
}

function togglePinnedLine(
  line
){

  pinnedLine =
    pinnedLine === line
      ? null
      : line;

  updateLineNumbers();
}

function renderFunctionViewer() {

  const box =
    get("functionViewer");

  const editor =
    get("repairEditor");

  if (!box || !editor) {
    return;
  }

  const items =
    extractCodeBlocksFromText(
      editor.value
    );

  box.innerHTML =
    items.length
      ? items.map((f,index)=>`

<div class="function-view-item">

  <div
    class="function-view-line"
    onclick="toggleFunctionView(${index})"
    oncontextmenu="event.preventDefault();selectCodeBlockByStart(${f.start})"
    ontouchstart="this._pressTimer=setTimeout(()=>selectCodeBlockByStart(${f.start}),600)"
    ontouchend="clearTimeout(this._pressTimer)"
    ontouchmove="clearTimeout(this._pressTimer)">

    <span class="function-view-mark">
      ${
        f.type === "section"
          ? "📁"
          : f.type === "variable"
          ? "📌"
          : "▼"
      }
    </span>

    <span class="function-view-name">
      ${escapeHtml(f.name)}
    </span>

  </div>

  <pre
    id="functionView${index}"
    class="function-view-code"
    style="display:none;">${escapeHtml(f.block)}</pre>

</div>

`).join("")
      : "コードブロックなし";
}