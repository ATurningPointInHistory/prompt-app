/* ===============================
   FILE: 04_tools.js
   Tools
=============================== */

let selectedTodoIndexes = new Set();

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

  String(text)
    .split("\n")
    .map(x => x.trim())
    .filter(x => !isTodoHeadingLine(x))
    .map(x =>
      x.replace(
        /^[✔✓☑□■・\-\*]\s*/,
        ""
      )
    )
    .filter(Boolean)
    .forEach(item => {

      list.push({
        text: item,
        done: false,
        created_at:
          new Date().toISOString()
      });

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

function deleteTodo(index) {

  const list =
    getTodoList();

  list.splice(index,1);

  localStorage.setItem(
    "todoList",
    JSON.stringify(list)
  );

  renderTodoList();
}

function renderTodoList() {

  const list =
    getTodoList();

  openFloatPanel(
    "開発TODO",

    `
<div class="todo-header">
  <button onclick="promptAddTodoItems()">➕</button>
  <button onclick="deleteSelectedTodos()">🗑</button>
</div>

<div class="todo-list">

${
list.length
? list.map((x, i) => `

<div class="todo-row">

  <input
    type="checkbox"
    class="todo-select"
    ${selectedTodoIndexes.has(i) ? "checked" : ""}
    onchange="toggleTodoSelect(${i})"
  >

  <button
    class="todo-check"
    onclick="toggleTodo(${i})">
    ${x.done ? "✔" : "□"}
  </button>

  <div
    class="todo-text ${x.done ? "todo-done" : ""}"
    oncontextmenu="event.preventDefault();showTodoDetail(${i})"
    ontouchstart="this._pressTimer=setTimeout(()=>showTodoDetail(${i}),600)"
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
   Float Panel Core
=============================== */

function openFloatPanel(title, bodyHtml){
  const panel = get("floatPanel");

  panel.innerHTML =
    `<div class="float-panel-header">
      <span class="float-panel-title">${title}</span>
      <button onclick="moveFloatPanelBy(0,-60)">↑</button>
      <button onclick="moveFloatPanelBy(0,60)">↓</button>
      <button onclick="moveFloatPanelBy(-60,0)">←</button>
      <button onclick="moveFloatPanelBy(60,0)">→</button>
      <button onclick="resetFloatPanelPosition()">↘</button>
      <button onmousedown="event.preventDefault()"
      onclick="closeFloatPanelKeepEditorSelection()">×</button>
    </div>` +
    bodyHtml;

  panel.style.display = "block";
}

function moveFloatPanelBy(dx, dy) {
  const panel = get("floatPanel");
  if (!panel) return;

  const rect = panel.getBoundingClientRect();

  let nextLeft = rect.left + dx;
  let nextTop = rect.top + dy;

  const maxLeft =
    window.innerWidth - rect.width;

  const maxTop =
    window.innerHeight - rect.height;

  nextLeft =
    Math.min(
      Math.max(0, nextLeft),
      Math.max(0, maxLeft)
    );

  nextTop =
    Math.min(
      Math.max(0, nextTop),
      Math.max(0, maxTop)
    );

  panel.style.left = nextLeft + "px";
  panel.style.top = nextTop + "px";
  panel.style.right = "auto";
  panel.style.bottom = "auto";
}

function resetFloatPanelPosition() {
  const panel = get("floatPanel");
  if (!panel) return;

  panel.style.left = "auto";
  panel.style.top = "auto";
  panel.style.right = "18px";
  panel.style.bottom = "88px";
}

function closeFloatPanelKeepEditorSelection() {
  const editor = get("repairEditor");
  const start = editor ? editor.selectionStart : null;
  const end = editor ? editor.selectionEnd : null;
  closeFloatPanel();
  if (editor && start !== null && end !== null) {
    setTimeout(() => {
      editor.focus();
      editor.setSelectionRange(start, end);
      updateCursorPosition();
    }, 0);
  }
}

function closeFloatPanel(){
  get("floatPanel").style.display = "none";
  const btn = get("toolsBtn");
  if(btn){
    btn.innerText = "⚙";
  }
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

function closeAllManagers() {
  get("template-manager").style.display = "none";
  get("danger-manager").style.display = "none";
  get("pattern-manager").style.display = "none";
  get("ai-preset-manager").style.display = "none";
}

function updatePanelButtonStates() {
  const templateBtn = get("templateBtn");
  const dangerBtn = get("dangerBtn");
  const patternBtn = get("patternBtn");
  const aiPresetBtn = get("aiPresetBtn");
  if (templateBtn) {
    templateBtn.classList.toggle(
      "active-panel",
      get("template-manager").style.display !== "none"
    );
  }
  if (dangerBtn) {
    dangerBtn.classList.toggle(
      "active-panel",
      get("danger-manager").style.display !== "none"
    );
  }
  if (patternBtn) {
    patternBtn.classList.toggle(
      "active-panel",
      get("pattern-manager").style.display !== "none"
    );
  }
  if (aiPresetBtn) {
    aiPresetBtn.classList.toggle(
      "active-panel",
    get("ai-preset-manager").style.display !== "none"
    );
  }
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