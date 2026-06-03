/* ===============================
   FILE: 04_tools.js
   Tools
=============================== */

function getTodoList() {
  return loadJson(
    "todoList",
    []
  );
}

function saveTodoItem(text) {

  if (!text.trim()) {
    return;
  }

  const list =
    getTodoList();

  list.push({
    text,
    done:false,
    created_at:
      new Date()
        .toISOString()
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
<div class="float-panel-actions">

<button onclick="
const text=
prompt('TODO追加');

if(text){
saveTodoItem(text);
}">
➕ 追加
</button>

</div>

<div>

${
list.length
? list.map((x,i)=>`

<div class="backup-history-item">

<div>

<button
onclick="toggleTodo(${i})">

${x.done?"✔":"□"}

</button>

${escapeHtml(x.text)}

</div>

<div>

<button
onclick="deleteTodo(${i})">

🗑
</button>

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