/* ===============================
   FILE: 05_repair_function.js
   Repair Function / Code Block Tools
=============================== */

function findFunctionBlock(functionName) {
  const editor = get("repairEditor");

  if (!editor) {
    return null;
  }

  const result =
    findFunctionBlockInText(
      editor.value,
      functionName
    );

  if (!result) {
    alert("関数が見つかりません");
    return null;
  }

  return result;
}

function findFunctionBlockInText(text, functionName) {

  const source =
    String(text || "");

  const name =
    escapeRegExp(functionName);

  const patterns = [
    new RegExp(
      "\\b(?:async\\s+)?function\\s+" +
      name +
      "\\s*\\(",
      "g"
    ),
    new RegExp(
      "\\b(?:const|let|var)\\s+" +
      name +
      "\\s*=\\s*(?:async\\s*)?\\([^)]*\\)\\s*=>\\s*\\{",
      "g"
    ),
    new RegExp(
      "\\b(?:const|let|var)\\s+" +
      name +
      "\\s*=\\s*(?:async\\s*)?[a-zA-Z0-9_$]+\\s*=>\\s*\\{",
      "g"
    ),
    new RegExp(
      "\\b(?:const|let|var)\\s+" +
      name +
      "\\s*=\\s*(?:async\\s+)?function\\s*\\(",
      "g"
    ),
    new RegExp(
      "\\bwindow\\." +
      name +
      "\\s*=\\s*(?:async\\s+)?function\\s*\\(",
      "g"
    )
  ];

  for (const regex of patterns) {
    const match =
      regex.exec(source);

    if (!match) continue;

    const start =
      match.index;

    const braceStart =
      source.indexOf(
        "{",
        start
      );

    if (braceStart === -1) continue;

    const block =
      findBraceBlockFromPosition(
        source,
        start,
        braceStart
      );

    if (!block) continue;

    return {
      start,
      end: block.end,
      block:
        source.slice(
          start,
          block.end
        )
    };
  }

  return null;
}

function selectFunctionBlock(){
  const name=
    prompt("関数名");
  if(!name)return;
  const result=
    findFunctionBlock(name);
  if(!result)return;
  const editor=
    get("repairEditor");
  editor.focus();
  editor.setSelectionRange(
    result.start,
    result.end
  );
}

function replaceFunctionBlock(){
  const name=
    prompt("置換する関数名");
  if(!name)return;
  const result=
    findFunctionBlock(name);
  if(!result)return;
  const newCode=
    prompt(
      "新コード",
      result.block
    );
  if(newCode===null)return;
  const editor=
    get("repairEditor");
  editor.value=
    editor.value.slice(0,result.start)+
    newCode+
    editor.value.slice(result.end);
  alert("置換完了");
}

function extractFunctionBlocksFromText(text) {
  const source =
    String(text || "");

  const blocks = [];

  const patterns = [
    {
      type: "function",
      regex:
        /(?:^|\n)\s*(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/g
    },
    {
      type: "arrow-function",
      regex:
        /(?:^|\n)\s*(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/g
    },
    {
      type: "arrow-function",
      regex:
        /(?:^|\n)\s*(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?[a-zA-Z0-9_$]+\s*=>\s*\{/g
    },
    {
      type: "function-expression",
      regex:
        /(?:^|\n)\s*(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s+)?function\s*\(/g
    },
    {
      type: "window-function",
      regex:
        /(?:^|\n)\s*window\.([a-zA-Z0-9_$]+)\s*=\s*(?:async\s+)?function\s*\(/g
    }
  ];

  patterns.forEach(pattern => {
    let match;

    pattern.regex.lastIndex = 0;

    while ((match = pattern.regex.exec(source)) !== null) {
      const name =
        match[1];

      const start =
        match[0].startsWith("\n")
          ? match.index + 1
          : match.index;

      const braceStart =
        source.indexOf(
          "{",
          start
        );

      if (braceStart === -1) {
        continue;
      }

      const block =
        findBraceBlockFromPosition(
          source,
          start,
          braceStart
        );

      if (!block) {
        continue;
      }

      blocks.push({
        type: pattern.type,
        name,
        start,
        end: block.end,
        block:
          source.slice(
            start,
            block.end
          )
      });
    }
  });

  return blocks
    .filter((item, index, self) =>
      index === self.findIndex(x =>
        x.start === item.start &&
        x.name === item.name
      )
    )
    .sort((a, b) => a.start - b.start);
}

function findBraceBlockFromPosition(source, start, braceStart) {
  let depth = 0;
  let i = braceStart;

  let inString = false;
  let quote = "";
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      i++;
      continue;
    }

    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        inString = false;
        quote = "";
      }
      i++;
      continue;
    }

    if (ch === "/" && next === "/") {
      inLineComment = true;
      i += 2;
      continue;
    }

    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i += 2;
      continue;
    }

    if (
      ch === "\"" ||
      ch === "'" ||
      ch === "`"
    ) {
      inString = true;
      quote = ch;
      i++;
      continue;
    }

    if (ch === "{") {
      depth++;
    }

    if (ch === "}") {
      depth--;

      if (depth === 0) {
        i++;

        if (source[i] === ";") {
          i++;
        }

        return {
          start,
          end: i
        };
      }
    }

    i++;
  }

  return null;
}

function extractCodeBlocksFromText(text) {

  const source =
    String(text || "");

  const blocks = [];

  const functionBlocks =
    extractFunctionBlocksFromText(source);

  // section comment: 複数行見出し
  const sectionRegex =
    /\/\*\s*=+\s*\n([\s\S]*?)\n\s*=+\s*\*\//g;

  [...source.matchAll(sectionRegex)]
    .forEach(match => {

      blocks.push({
        type: "section",
        name:
          match[1]
            .split("\n")
            .map(x => x.trim())
            .filter(Boolean)[0] ||
          "Section",
        start: match.index,
        end:
          match.index +
          match[0].length,
        block: match[0]
      });

    });

  // top-level let const var only
  const variableRegex =
    /^(let|const|var)\s+([a-zA-Z0-9_$]+)/gm;

  [...source.matchAll(variableRegex)]
    .forEach(match => {

      const start =
        match.index;

      const insideFunction =
        functionBlocks.some(fn =>
          start > fn.start &&
          start < fn.end
        );

      if (insideFunction) {
        return;
      }

      const name =
        match[2];

      let end =
        source.indexOf(
          ";",
          start
        );

      if (end === -1) {
        end =
          source.indexOf(
            "\n",
            start
          );
      }

      if (end === -1) {
        end =
          source.length;
      }

      blocks.push({
        type: "variable",
        name,
        start,
        end: end + 1,
        block:
          source.slice(
            start,
            end + 1
          )
      });

    });

  functionBlocks.forEach(item => {

    blocks.push({
      type: "function",
      ...item
    });

  });

  return blocks.sort(
    (a,b)=>
    a.start-b.start
  );
}

/* ===============================
   Code Block List / Move
=============================== */

function showFunctionList() {

  const editor =
    get("repairEditor");

  const text =
    editor.value;

  if (!text.trim()) {
    alert("HTMLが空です");
    return;
  }

  console.log(
    "editor total:",
    text.split(/\r?\n/).length
  );

  console.log(
    "has CR:",
    text.includes("\r")
  );

  const blocks =
    extractCodeBlocksFromText(
      text
    );

  let html = "";

  if (blocks.length === 0) {

    html = "コードブロックなし";

  } else {

    html =
      blocks.map((item, i) => {

        const line =
          text
            .slice(
              0,
              item.start
            )
            .split(/\r?\n/)
            .length;

        console.log(
          `[${item.type}] ${item.name} / L${line}`
        );

        const moveButton =
          item.type === "function"
            ? `
<div class="float-panel-actions">
  <button
    onclick="
      moveFunctionPrompt(
        '${item.name}'
      )
    ">
    📦 Move
  </button>
</div>
`
            : "";

return `

<div class="function-list-row">

  <button
    class="
      float-list-btn
      function-list-select
    "
    onclick="
      selectCodeBlockByIndex(${i});
      closeFloatPanelKeepEditorSelection();
    ">

    [${item.type}]
    ${i + 1}.
    ${escapeHtml(item.name)}
    / L${line}

  </button>

  ${moveButton}

</div>
`;

      }).join("");
  }

  openFloatPanel(
    `コードブロック一覧 (${blocks.length})`,
    `
    <div class="float-panel-actions">
      <button onclick="copyCodeBlockList()">
        📋 一覧コピー
      </button>
    </div>
    ` + html
  );
}

function buildCodeBlockListText() {

  const editor =
    get("repairEditor");

  if (!editor) return "";

  const text =
    editor.value;

  const blocks =
    extractCodeBlocksFromText(text);

  return blocks.map((item, i) => {

    const line =
      text
        .slice(0, item.start)
        .split("\n")
        .length;

    return `[${item.type}] ${i + 1}. ${item.name} / L${line}`;

  }).join("\n");
}

function copyCodeBlockList() {

  const text =
    buildCodeBlockListText();

  if (!text) {
    alert("コピーする一覧がありません");
    return;
  }

  if (
    navigator.clipboard &&
    window.isSecureContext
  ) {
    navigator.clipboard
      .writeText(text)
      .then(() =>
        alert("コードブロック一覧をコピーしました")
      )
      .catch(() => {
        const ok =
          copyTextFallback(text);

        alert(
          ok
            ? "コードブロック一覧をコピーしました"
            : "コピー失敗"
        );
      });

    return;
  }

  const ok =
    copyTextFallback(text);

  alert(
    ok
      ? "コードブロック一覧をコピーしました"
      : "コピー失敗"
  );
}

function moveFunctionPrompt(functionName) {

  const editor =
    get("repairEditor");

  if (!editor) return;

  const sections =
    extractCodeBlocksFromText(editor.value)
      .filter(item =>
        item.type === "section"
      );

  if (sections.length === 0) {
    alert("移動先セクションが見つかりません");
    return;
  }

  const html =
    sections.map(item => {
      return `
<button
  class="float-list-btn"
  onclick="
    moveFunctionToSectionByStart(
      '${functionName}',
      ${item.start}
    );
  ">
  ${escapeHtml(item.name)}
</button>
`;
    }).join("");

  openFloatPanel(
    `移動先を選択：${functionName}`,
    html
  );
}

function moveFunctionToSectionByStart(
  functionName,
  sectionStart
) {

  const editor =
    get("repairEditor");

  if (!editor) return;

  let html =
    editor.value;

  const block =
    findFunctionBlockInText(
      html,
      functionName
    );

  if (!block) {
    alert("関数が見つかりません");
    return;
  }

  const sections =
    extractCodeBlocksFromText(html)
      .filter(item =>
        item.type === "section"
      );

  const target =
    sections.find(item =>
      item.start === sectionStart
    );

  if (!target) {
    alert("移動先セクションが見つかりません");
    return;
  }

  const ok =
    confirm(
      `${functionName}\n\nを\n\n${target.name}\n\nへ移動しますか？`
    );

  if (!ok) return;

  repairUndoStack.push(html);
  repairRedoStack = [];

  html =
    html.slice(0, block.start) +
    html.slice(block.end);

  let insertPos =
    target.end;

  if (block.start < target.end) {
    insertPos =
      target.end -
      (block.end - block.start);
  }

  html =
    html.slice(0, insertPos) +
    "\n\n" +
    block.block +
    "\n" +
    html.slice(insertPos);

  editor.value =
    html;

  repairLastValue =
    html;

  if (typeof updateLineNumbers === "function") {
    updateLineNumbers();
  }

  if (typeof updateCursorPosition === "function") {
    updateCursorPosition();
  }

  if (typeof updateRepairStatus === "function") {
    updateRepairStatus(
      `${functionName} → ${target.name}`
    );
  }

  closeFloatPanel();

  alert("移動完了");
}

/* ===============================
   Code Block Sort
=============================== */

function showFunctionSortList() {

  const editor =
    get("repairEditor");

  const text =
    editor.value;

  if (!text.trim()) {
    alert("HTMLが空です");
    return;
  }

  functionSortList =
    extractCodeBlocksFromText(
      text
    );

  if (
    functionSortList.length === 0
  ) {
    openFloatPanel(
      "コードブロック並べ替え",
      "コードブロックなし"
    );
    return;
  }

  renderFunctionSortList();
}

function renderFunctionSortList() {

  const filteredList =
    getFilteredFunctionSortList();

  const html =
`
<div class="float-panel-actions">

  <button
    onclick="
      setFunctionSortFilter(
        'all'
      )
    ">
    ALL
  </button>

  <button
    onclick="
      setFunctionSortFilter(
        'section'
      )
    ">
    SECTION
  </button>

  <button
    onclick="
      setFunctionSortFilter(
        'variable'
      )
    ">
    VAR
  </button>

  <button
    onclick="
      setFunctionSortFilter(
        'function'
      )
    ">
    FUNC
  </button>

</div>

<div class="float-panel-actions">

  <button
    onclick="
      applyFunctionSortList()
    ">
    ✅ 並べ替えを適用
  </button>

</div>
`
+
filteredList.map(
(entry)=>{

const item =
  entry.item;

const originalIndex =
  entry.index;

return `
<div

  class="
    function-sort-row
  "

  draggable="true"

  data-index="
    ${originalIndex}
  "

  ondragstart="
    handleFunctionSortDragStart(
      event
    )
  "

  ondragover="
    handleFunctionSortDragOver(
      event
    )
  "

  ondrop="
    handleFunctionSortDrop(
      event
    )
  "
>

  <div
    class="
      function-drag-handle
    ">
    ≡
  </div>

  <button

    class="
      float-list-btn
      function-sort-select
    "

    onclick="
      selectCodeBlockByIndex(
        ${originalIndex}
      );

      closeFloatPanelKeepEditorSelection();
    "

  >

    [${item.type}]
    ${originalIndex + 1}.
    ${escapeHtml(
      item.name
    )}

  </button>

  <div
    class="
      function-sort-actions
    ">

    <button
      onclick="
        moveFunctionSortItem(
          ${originalIndex},
          -1
        )
      ">
      ↑
    </button>

    <button
      onclick="
        moveFunctionSortItem(
          ${originalIndex},
          1
        )
      ">
      ↓
    </button>

  </div>

</div>
`;
})
.join("");

  openFloatPanel(
    `コードブロック並べ替え (${functionSortList.length})`,
    html
  );
}

function moveFunctionSortItem(index, direction) {
  const next =
    index + direction;

  if (
    next < 0 ||
    next >= functionSortList.length
  ) {
    return;
  }

  const temp =
    functionSortList[index];

  functionSortList[index] =
    functionSortList[next];

  functionSortList[next] =
    temp;

  renderFunctionSortList();
}

function setFunctionSortFilter(filter) {
  functionSortFilter = filter;
  renderFunctionSortList();
}

function getFilteredFunctionSortList() {
  if (functionSortFilter === "all") {
    return functionSortList.map((item, index) => ({
      item,
      index
    }));
  }

  return functionSortList
    .map((item, index) => ({
      item,
      index
    }))
    .filter(entry =>
      entry.item.type === functionSortFilter
    );
}

let functionSortDragIndex = null;

function handleFunctionSortDragStart(event) {
  functionSortDragIndex =
    Number(
      event.currentTarget.dataset.index
    );
}

function handleFunctionSortDragOver(event) {
  event.preventDefault();
}

function handleFunctionSortDrop(event) {
  event.preventDefault();

  const dropIndex =
    Number(
      event.currentTarget.dataset.index
    );

  if (
    functionSortDragIndex === null ||
    functionSortDragIndex === dropIndex
  ) {
    return;
  }

  const item =
    functionSortList.splice(
      functionSortDragIndex,
      1
    )[0];

  functionSortList.splice(
    dropIndex,
    0,
    item
  );

  functionSortDragIndex = null;

  renderFunctionSortList();
}

function applyFunctionSortList() {

  const editor =
    get("repairEditor");

  if (!editor) return;

  const text =
    editor.value;

  if (!text.trim()) {
    alert("HTMLが空です");
    return;
  }

  const originalBlocks =
    extractCodeBlocksFromText(text);

  if (
    originalBlocks.length !==
    functionSortList.length
  ) {
    alert(
      "コードブロック数が一致しません。\n" +
      "再度一覧を開き直してください。"
    );
    return;
  }

  const ok =
    confirm(
      "現在の並び順をHTMLへ反映します。\n\n" +
      "事前に保存・バックアップ済みですか？"
    );

  if (!ok) return;

  repairUndoStack.push(text);
  repairRedoStack = [];

  let result = "";
  let cursor = 0;

  originalBlocks.forEach((block, index) => {
    result += text.slice(
      cursor,
      block.start
    );

    result +=
      functionSortList[index].block;

    cursor = block.end;
  });

  result += text.slice(cursor);

  editor.value = result;
  repairLastValue = result;

  updateLineNumbers();
  updateCursorPosition();
  updateRepairStatus(
    "コードブロック並べ替え適用"
  );

  autoSaveRepairDraft();

  alert("並べ替えを適用しました");
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

function selectCodeBlockByStart(start) {

  const editor =
    get("repairEditor");

  if (!editor) {
    return;
  }

  editor.focus();

  editor.setSelectionRange(
    start,
    start
  );

  const line =
    editor.value
      .slice(0,start)
      .split("\n")
      .length;

  editor.scrollTop =
    Math.max(
      0,
      (line - 3) * 18
    );

  updateCursorPosition();

}
