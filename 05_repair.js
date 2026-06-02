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

let functionSortList = [];
let functionSortFilter = "all";
let dragSortIndex = null;
let pinnedLine = null;

/* ===============================
   Repair File I/O
=============================== */

function loadRepairHtml() {
  const input =
    document.createElement("input");

  input.type = "file";
  input.accept =
    ".html,.json,text/html,application/json";

  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed =
          JSON.parse(reader.result);

        if (parsed.html) {
          const editor =
            get("repairEditor");

          editor.value = parsed.html;
          editor.scrollLeft = 0;

          repairLastValue = editor.value;

          updateLineNumbers();
          updateCursorPosition();
          updateRepairStatus("フルバックアップJSON読込");

          alert("フルバックアップJSON読込完了");
          return;
        }
      } catch {}

      const editor =
        get("repairEditor");

      editor.value = reader.result;
      editor.scrollLeft = 0;

      repairLastValue = editor.value;

      updateLineNumbers();
      updateCursorPosition();
      updateRepairStatus("HTML読込");

      alert("HTML読込完了");
    };

    reader.readAsText(file);
  };

  input.click();
}

function saveRepairHtml() {
  const editor =
    get("repairEditor");

  const html =
    editor.value.trim();

  if (!html) {
    alert("HTMLが空です");
    return;
  }

  const blob =
    new Blob(
      [html],
      { type: "text/html" }
    );

  const a =
    document.createElement("a");

  a.href =
    URL.createObjectURL(blob);

  const timestamp =
    new Date()
      .toISOString()
      .replace(/[:.]/g, "-");

  a.download =
    `AIPro_Repaired_${timestamp}.html`;

  a.click();

  setTimeout(() => {
    URL.revokeObjectURL(a.href);
  }, 1000);

  repairLastValue =
    editor.value;

  updateRepairStatus(
    "修正版保存完了"
  );

  alert("修正版保存完了");
}

async function copyRepairHtml() {
  const editor =
    get("repairEditor");

  if (!editor) return;

  const html =
    editor.value.trim();

  if (!html) {
    alert("HTMLが空です");
    return;
  }

  try {
    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {
      await navigator.clipboard.writeText(html);
      alert("HTMLコピー完了");
      return;
    }

    const ok =
      copyTextFallback(html);

    alert(
      ok
        ? "HTMLコピー完了"
        : "コピー失敗"
    );

  } catch (e) {
    const ok =
      copyTextFallback(html);

    alert(
      ok
        ? "HTMLコピー完了"
        : "コピー失敗"
    );
  }
}

/* ===============================
   Repair Cleanup Tools
=============================== */

async function cleanupCandidates() {
  const editor = get("repairEditor");

  const html =
    editor && editor.value.trim()
      ? editor.value
      : "<!DOCTYPE html>\n" + document.documentElement.outerHTML;

  const externalJs =
    await collectExternalScriptText(html);

  const jsForCheck =
    html + "\n" + externalJs;

  const funcs =
    [...jsForCheck.matchAll(
      /function\s+([a-zA-Z0-9_$]+)\s*\(/g
    )].map(x => x[1]);

  const onclicks =
    [...html.matchAll(
      /onclick="([a-zA-Z0-9_$]+)\(/g
    )].map(x => x[1]);

  const parser = new DOMParser();

  const doc =
    parser.parseFromString(
      html,
      "text/html"
    );

  const ids =
    [...doc.querySelectorAll("[id]")]
      .map(el => el.id)
      .filter(Boolean);

  const safeIgnoreFuncs = [
    "diagnoseRepairHtml",
    "diagnoseHtml",
    "showHtmlHealth",
    "closeFloatPanel",
    "loadSettings",
    "checkSafeMode"
  ];

  const unusedFuncs =
    funcs.filter(fn => {
      if (safeIgnoreFuncs.includes(fn)) return false;

      const count =
        (jsForCheck.match(
          new RegExp("\\b" + escapeRegExp(fn) + "\\b", "g")
        ) || []).length;

      return count <= 1 && !onclicks.includes(fn);
    });

  const orphanIds =
    ids.filter(id => {
      if (!id) return false;

      if (/[\$\{\}\(\)\[\]\^\|\\]/.test(id)) {
        return false;
      }

      if ([
        "appPage",
        "repairPage",
        "floatPanel",
        "functionListBox",
        "diffResultBox",
        "diagnoseResultBox",
        "healthResultBox"
      ].includes(id)) {
        return false;
      }

      try {
        const count =
          (
            jsForCheck.match(
              new RegExp(
                "\\b" + escapeRegExp(id) + "\\b",
                "g"
              )
            ) || []
          ).length;

        return count <= 1;

      } catch {
        return false;
      }
    });

  const message =
    "削除候補チェック\n\n" +
    "【未使用function】\n" +
    (unusedFuncs.length ? unusedFuncs.join("\n") : "なし") +
    "\n\n【孤立id】\n" +
    (orphanIds.length ? orphanIds.join("\n") : "なし") +
    "\n\nOKで修復エディタ内の候補をコメント化します。";

  const ok = confirm(message);
  if (!ok) return;

  commentOutCleanupCandidates(
    unusedFuncs,
    orphanIds
  );
}

function commentOutCleanupCandidates(unusedFuncs, orphanIds) {
  const editor = get("repairEditor");
  if (!editor || !editor.value.trim()) {
    alert("修復モードでHTMLを読み込んでから実行してください");
    return;
  }
  let html = editor.value;
  repairUndoStack.push(html);
  repairRedoStack = [];
  unusedFuncs.forEach(fn => {
    const block = findFunctionBlockInText(html, fn);
    if (!block) return;
    if (block.block.includes("cleanup候補")) return;
    html =
      html.slice(0, block.start) +
      "/* cleanup候補: 未使用function " + fn + "\n" +
      block.block +
      "\n*/" +
      html.slice(block.end);
  });
  orphanIds.forEach(id => {
    const reg = new RegExp(
      `id=(["'])${escapeRegExp(id)}\\1`,
      "g"
    );
    html = html.replace(reg, match => {
      if (match.includes("data-cleanup-disabled-id")) {
        return match;
      }
      return `data-cleanup-disabled-id="${id}"`;
    });
  });
  editor.value = html;
  repairLastValue = html;
  updateRepairStatus(
    "削除候補をコメント化 / id無効化"
  );
  alert(
    "削除候補を安全処理しました。\n\n" +
    "未使用function：コメント化\n" +
    "孤立id：data-cleanup-disabled-id に変更\n\n" +
    "HTML HEALTH / 編集内容診断で確認してください。"
  );
}

function deleteCommentedCleanupBlocks() {
  const editor = get("repairEditor");

  if (!editor || !editor.value.trim()) {
    alert("修復モードでHTMLを読み込んでから実行してください");
    return;
  }

  let html = editor.value;
  const before = html;

  const cleanupBlockRegex =
    /\/\*\s*cleanup候補:\s*未使用function\s+[a-zA-Z0-9_$]+[\s\S]*?\*\//g;

  const functionBlocks =
    (html.match(cleanupBlockRegex) || [])
      .filter(block =>
        /function\s+[a-zA-Z0-9_$]+\s*\(/.test(block)
      );

  const disabledIds =
    html.match(
      /\sdata-cleanup-disabled-id="[^"]+"/g
    ) || [];

  const message =
    "完全削除確認\n\n" +
    "削除対象:\n" +
    "・コメント化済みfunction: " + functionBlocks.length + "件\n" +
    "・無効化済みid属性: " + disabledIds.length + "件\n\n" +
    "OKで完全削除します。\n" +
    "事前にバックアップ保存済みか確認してください。";

  const ok = confirm(message);
  if (!ok) return;

  if (
    functionBlocks.length === 0 &&
    disabledIds.length === 0
  ) {
    alert("削除対象はありません");
    return;
  }

  repairUndoStack.push(before);
  repairRedoStack = [];

  functionBlocks.forEach(block => {
    html = html.replace(block, "");
  });

  html = html.replace(
    /\sdata-cleanup-disabled-id="[^"]+"/g,
    ""
  );

  html = html.replace(/\n{4,}/g, "\n\n\n");

  editor.value = html;
  repairLastValue = html;

  updateRepairStatus(
    "コメント化済み候補を完全削除"
  );

  alert(
    "完全削除しました。\n\n" +
    "HTML HEALTH / 編集内容診断で確認してください。"
  );
}

/* ===============================
   Code Block / Function Tools
=============================== */

function findFunctionBlock(functionName){
  const editor=get("repairEditor");
  const text=editor.value;
  const start=
    text.indexOf(
      `function ${functionName}`
    );
  if(start===-1){
    alert("関数が見つかりません");
    return null;
  }
  const braceStart=
    text.indexOf("{",start);
  let depth=1;
  let end=braceStart+1;
  while(
    end<text.length &&
    depth>0
  ){
    if(text[end]==="{") depth++;
    if(text[end]==="}") depth--;
    end++;
  }
  return{
    start,
    end,
    block:text.slice(start,end)
  };
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

function findFunctionBlockInText(text, functionName) {
  const start =
    text.indexOf(`function ${functionName}`);
  if (start === -1) return null;
  const braceStart =
    text.indexOf("{", start);
  if (braceStart === -1) return null;
  let depth = 1;
  let end = braceStart + 1;
  while (end < text.length && depth > 0) {
    if (text[end] === "{") depth++;
    if (text[end] === "}") depth--;
    end++;
  }
  return {
    start,
    end,
    block: text.slice(start, end)
  };
}


function extractFunctionBlocksFromText(text) {
  const source =
    String(text || "");

  const blocks = [];

  const regex =
    /^\s*(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/gm;

  let match;

  while ((match = regex.exec(source)) !== null) {
    const name =
      match[1];

    const start =
      match.index;

    const braceStart =
      source.indexOf("{", start);

    if (braceStart === -1) continue;

    let depth = 1;
    let end = braceStart + 1;

    while (
      end < source.length &&
      depth > 0
    ) {
      if (source[end] === "{") depth++;
      if (source[end] === "}") depth--;
      end++;
    }

    blocks.push({
      type: "function",
      name,
      start,
      end,
      block:
        source.slice(start, end)
    });
  }

  return blocks;
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

  updateLineNumbers();
  updateCursorPosition();
  updateRepairStatus(
    `${functionName} → ${target.name}`
  );

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

/* ===============================
   Repair Diagnose / Preview
=============================== */

async function diagnoseRepairHtml() {
  let html =
    get("repairEditor").value;

  const externalJs =
    await collectExternalScriptText(html);

  const jsForCheck =
    html + "\n" + externalJs;

  const scripts =
    getExternalScriptSrcList(html);

  const scriptInfo =
    scripts.length
      ? "✔ external scripts:\n" +
        scripts.join("\n")
      : "✔ external scripts:none";

  const parser =
    new DOMParser();

  const doc =
    parser.parseFromString(
      html,
      "text/html"
    );

  let cleanHtml = html
    .replace(
      /<script[\s\S]*?<\/script>/gi,
      ""
    )
    .replace(
      /<style[\s\S]*?<\/style>/gi,
      ""
    );

  const report = [];

  report.push(
    "Repair HTML Diagnose\n"
  );

  // div整合性
  const open =
    (cleanHtml.match(
      /<div\b/g
    ) || []).length;

  const close =
    (cleanHtml.match(
      /<\/div>/g
    ) || []).length;

  report.push(
    open === close
      ? `✔ div: ${open}/${close}`
      : `⚠ div: ${open}/${close}`
  );

  // DOM
  const parserError =
    doc.querySelector(
      "parsererror"
    );

  report.push(
    parserError
      ? "⚠ DOM解析エラー"
      : "✔ DOM解析OK"
  );

  // id重複
  const ids =
    [...doc.querySelectorAll("[id]")]
      .map(el => el.id);

  const dupIds =
    [...new Set(
      ids.filter(
        (id, i) =>
        ids.indexOf(id) !== i
      )
    )];

  report.push(
    dupIds.length
      ? `⚠ id重複\n${dupIds.join("\n")}`
      : "✔ id重複なし"
  );

  report.push("");
  report.push(scriptInfo);

  // JS構文
  try {
    const scriptBlocks =
      [...doc.querySelectorAll("script")];

    scriptBlocks.forEach(s => {
      if (s.src) return;
      new Function(
        s.textContent
      );
    });

    report.push("✔ JS構文OK");

  } catch (e) {
    report.push(
      `⚠ JS構文エラー\n${e.message}`
    );
  }

  // function重複
  const htmlForFunctionCheck =
    jsForCheck
      .replace(/\/\/.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");

  const funcs =
    [...htmlForFunctionCheck.matchAll(
      /^\s*(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/gm
    )]
    .map(x => x[1]);

  const dupFuncs =
    [...new Set(
      funcs.filter(
        (f, i) =>
        funcs.indexOf(f) !== i
      )
    )];

  report.push(
    dupFuncs.length
      ? `⚠ function重複\n${dupFuncs.join("\n")}`
      : "✔ function重複なし"
  );

  // onclick未定義
  const onclicks =
    [...html.matchAll(
      /onclick="([a-zA-Z0-9_$]+)\(/g
    )]
    .map(x => x[1]);

  const undefinedFns =
    [...new Set(
      onclicks.filter(
        fn =>
        !funcs.includes(fn)
      )
    )];

  report.push(
    undefinedFns.length
      ? `⚠ 未定義onclick\n${undefinedFns.join("\n")}`
      : "✔ onclick定義OK"
  );

  // 未使用function
  const unusedFns =
    funcs.filter(fn => {
      if (
        fn === "diagnoseRepairHtml" ||
        fn === "closeFloatPanel"
      ) {
        return false;
      }

      const useCount =
        (jsForCheck.match(
          new RegExp(
            "\\b" + fn + "\\b",
            "g"
          )
        ) || []).length;

      return useCount <= 1;
    });

  report.push(
    unusedFns.length
      ? `⚠ 未使用function\n${
          unusedFns
            .slice(0, 15)
            .join("\n")
        }`
      : "✔ 未使用functionなし"
  );

  // 孤立id
  const orphanIds =
    ids.filter(id => {
      if (
        !id ||
        /[()[\]^]/.test(id)
      ) {
        return false;
      }

      try {
        const useCount =
          (
            jsForCheck.match(
              new RegExp(
                "\\b" +
                escapeRegExp(id) +
                "\\b",
                "g"
              )
            ) || []
          ).length;

        return useCount <= 1;

      } catch {
        return false;
      }
    });

  report.push(
    orphanIds.length
      ? `⚠ 孤立id\n${
          orphanIds
            .slice(0, 15)
            .join("\n")
        }`
      : "✔ 孤立idなし"
  );

  const result =
    report.join("\n");

  window.latestDiagnoseResult =
    result;

  openFloatPanel(
    "編集内容診断",
    `
    <div class="float-panel-actions">
      <button onclick="copyDiagnoseResult()">
        📋 コピー
      </button>
    </div>
    <pre
      id="diagnoseResultBox"
      class="code-preview">
${escapeHtml(result)}
    </pre>
    `
  );
}

function copyDiagnoseResult() {
  const text =
    window.latestDiagnoseResult || "";
  if (!text) {
    alert("コピー内容なし");
    return;
  }
  if (
    navigator.clipboard &&
    window.isSecureContext
  ) {
    navigator.clipboard
      .writeText(text)
      .then(() =>
        alert("コピー完了")
      )
      .catch(() => {
        const ok =
          copyTextFallback(text);
        alert(
          ok
            ? "コピー完了"
            : "コピー失敗"
        );
      });
    return;
  }
  const ok =
    copyTextFallback(text);
  alert(
    ok
      ? "コピー完了"
      : "コピー失敗"
  );
}

function previewRepairHtml() {
  const box = get("repairPreview");
  const btn = get("previewBtn");
  // OFF処理
  if (box.style.display === "block") {
    box.style.display = "none";
    btn.innerText =
      "🎨 色分けプレビュー";
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
  btn.innerText =
    "❌ プレビュー閉じる";
}
