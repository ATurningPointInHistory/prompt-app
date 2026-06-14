/* ===============================
   FILE: 05_repair_sort.js
   Repair Code Block Move / Sort
=============================== */

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
