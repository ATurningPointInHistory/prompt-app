/* ===============================
   FILE: 04_tools.js
   Tools
=============================== */

/* ===============================
   TODO Management
=============================== */

let selectedTodoIndexes = new Set();

function normalizeTodoText(text) {

  return String(text || "")
    .trim()
    .replace(
      /^[✔✓☑□■・\-\*]\s*/,
      ""
    )
    .trim();

}

function getSortedTodoList(list) {

  return list
    .map((item, index) => ({
      ...item,
      _index: index
    }))
    .sort((a, b) =>
      Number(a.done) -
      Number(b.done)
    );

}

function renderTodoList() {

  const list =
    getTodoList();

  const sortedList =
    getSortedTodoList(list);

  openFloatPanel(
    "開発TODO",

    `
<div class="todo-header">

  <button onclick="promptAddTodoItems()">
    ➕
  </button>

  <button onclick="toggleSelectAllTodos()">
    ☑
  </button>

  <button onclick="copySelectedTodos()">
    📋
  </button>

  <button onclick="deleteSelectedTodos()">
    🗑
  </button>

</div>

<div class="todo-list">

${
sortedList.length
? sortedList.map((x) => `

<div class="todo-row">

  <input
    type="checkbox"
    class="todo-select"
    ${selectedTodoIndexes.has(x._index) ? "checked" : ""}
    onchange="toggleTodoSelect(${x._index})"
  >

  <button
    class="todo-check"
    onclick="toggleTodo(${x._index})">
    ${x.done ? "✔" : "□"}
  </button>

  <div
    class="todo-text ${x.done ? "todo-done" : ""}"
    oncontextmenu="event.preventDefault();showTodoDetail(${x._index})"
    ontouchstart="this._pressTimer=setTimeout(()=>showTodoDetail(${x._index}),600)"
    ontouchend="clearTimeout(this._pressTimer)"
    ontouchmove="clearTimeout(this._pressTimer)">
    ${escapeHtml(x.text)}
  </div>

</div>

`).join("")
: "TODOなし"
}

</div>
`
  );

}

function isTodoHeadingLine(line) {
  const text = String(line || "").trim();

  if (!text) return true;

  return (
    /^#+\s*/.test(text) ||
    /^[-=]{3,}$/.test(text) ||
    /^【.*】$/.test(text) ||
    /^\[.*\]$/.test(text) ||
    /^(完了|実装済|進行中|TODO|次やること|候補)/.test(text)
  );
}

function getTodoList() {
  return loadJson(
    "todoList",
    []
  );
}

function promptAddTodoItems() {

  const text =
    prompt(
      "TODO追加\n\n" +
      "改行で複数追加できます。\n\n" +
      "例:\n" +
      "AI回答保存\n" +
      "引き継ぎ生成\n" +
      "CSS整理",
      ""
    );

  if (!text) {
    return;
  }

  saveTodoItems(text);
}

function saveTodoItems(text) {

  if (!String(text || "").trim()) {
    return;
  }

  const list =
    getTodoList();

  const existingTexts =
    new Set(
      list.map(item =>
        normalizeTodoText(item.text)
      )
    );

  String(text)
    .split("\n")
    .map(line =>
      normalizeTodoText(line)
    )
    .filter(line =>
      line &&
      !isTodoHeadingLine(line)
    )
    .forEach(itemText => {

      if (
        existingTexts.has(itemText)
      ) {
        return;
      }

      list.push({
        text: itemText,
        done: false,
        created_at:
          new Date()
            .toISOString()
      });

      existingTexts.add(itemText);

    });

  localStorage.setItem(
    "todoList",
    JSON.stringify(list)
  );

  renderTodoList();

}

function toggleTodo(index) {

  const list =
    getTodoList();

  if (!list[index]) {
    return;
  }

  list[index].done =
    !list[index].done;

  localStorage.setItem(
    "todoList",
    JSON.stringify(list)
  );

  renderTodoList();
}

function toggleTodoSelect(index) {

  if (selectedTodoIndexes.has(index)) {
    selectedTodoIndexes.delete(index);
  } else {
    selectedTodoIndexes.add(index);
  }

  renderTodoList();
}

function deleteSelectedTodos() {

  const list =
    getTodoList();

  if (selectedTodoIndexes.size === 0) {
    alert("削除するTODOを選択してください");
    return;
  }

  const ok =
    confirm(
      selectedTodoIndexes.size +
      "件のTODOを削除しますか？"
    );

  if (!ok) return;

  const next =
    list.filter((_, index) =>
      !selectedTodoIndexes.has(index)
    );

  selectedTodoIndexes.clear();

  localStorage.setItem(
    "todoList",
    JSON.stringify(next)
  );

  renderTodoList();
}

function showTodoDetail(index) {
  const list =
    getTodoList();

  const item =
    list[index];

  if (!item) return;

  alert(item.text);
}

function toggleSelectAllTodos() {

  const list =
    getTodoList();

  if (
    selectedTodoIndexes.size ===
    list.length
  ) {
    selectedTodoIndexes.clear();
  } else {
    selectedTodoIndexes =
      new Set(
        list.map((_, i) => i)
      );
  }

  renderTodoList();
}

function copySelectedTodos() {

  const list =
    getTodoList();

  const targets =
    list.filter((_, i) =>
      selectedTodoIndexes.has(i)
    );

  if (!targets.length) {
    alert("コピーするTODOを選択してください");
    return;
  }

  const text =
    targets.map(item =>
      (item.done ? "✔ " : "□ ") +
      item.text
    ).join("\n");

  const ok =
    copyTextFallback(text);

  alert(
    ok
      ? "選択TODOをコピーしました"
      : "コピー失敗"
  );
}

/* ===============================
   Code Navigation
=============================== */

function selectCodeBlockByIndex(index) {
  const editor =
    get("repairEditor");

  if (!editor) return;

  const text =
    editor.value;

  const blocks =
    extractCodeBlocksFromText(text);

  const item =
    blocks[index];

  if (!item) {
    alert("コードブロックが見つかりません");
    return;
  }

  editor.focus();

  editor.setSelectionRange(
    item.start,
    item.end
  );

  const line =
    text
      .slice(0, item.start)
      .split("\n")
      .length;

  const lineHeight = 18;

  editor.scrollTop =
    Math.max(
      0,
      (line - 3) * lineHeight
    );

  updateCursorPosition();
}

function jumpToLine(lineNumber) {
  const editor =
    get("repairEditor");

  if (!editor) return;

  const lines =
    String(editor.value || "")
      .split("\n");

  const targetLine =
    Math.min(
      Math.max(1, Number(lineNumber) || 1),
      lines.length
    );

  let pos = 0;

  for (
    let i = 0;
    i < targetLine - 1;
    i++
  ) {
    pos +=
      (lines[i] || "").length + 1;
  }

  editor.focus();

  editor.setSelectionRange(
    pos,
    pos
  );

  const lineHeight = 18;

  editor.scrollTop =
    Math.max(
      0,
      (targetLine - 3) * lineHeight
    );

  updateCursorPosition();
}

/* ===============================
   Tool Menu / Category
=============================== */

function toggleToolCategory(id) {
  const box = get(id);
  const btn =
    document.querySelector(
      `[onclick="toggleToolCategory('${id}')"]`
    );
  const isOpen =
    getComputedStyle(box).display !== "none";
  box.style.display =
    isOpen ? "none" : "grid";
  if (btn) {
    btn.innerText =
      btn.innerText.replace(
        isOpen ? "▲" : "▼",
        isOpen ? "▼" : "▲"
      );
  }
}

function toggleCommandMenu() {
  const menu =
    get("commandMenu");
  menu.style.display =
    menu.style.display === "none"
      ? "block"
      : "none";
}

/* ===============================
   Tool Actions
=============================== */

function reloadAppPage() {
  const ok =
    confirm(
      "ページを再読み込みしますか？\n\n未保存の編集内容がある場合は失われる可能性があります。"
    );

  if (!ok) return;

  location.reload();
}

console.log("CHANGELOG");
console.table(CHANGELOG);