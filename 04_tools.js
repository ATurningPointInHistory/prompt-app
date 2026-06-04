/* ===============================
   FILE: 04_tools.js
   Tools
=============================== */

/* ===============================
   TODO Management
=============================== */

let todoDetailOpening = false;

let selectedTodoIndexes = new Set();

function getProjectState() {

  return loadJson(
    "projectState",
    {

      projectName:
        "AIプロンプト生成Pro",

      version:
        "5.8.0",

      currentWork:
        "",

      nextTask:
        "",

      note:
        ""

    }
  );

}

function saveProjectState(
  state
) {

  localStorage.setItem(
    "projectState",
    JSON.stringify(state)
  );

}

function editProjectState() {

  const state =
    getProjectState();

  const currentWork =
    prompt(
      "現在作業中",
      state.currentWork
    );

  if (
    currentWork === null
  ) {
    return;
  }

  const nextTask =
    prompt(
      "次にやること",
      state.nextTask
    );

  if (
    nextTask === null
  ) {
    return;
  }

  const note =
    prompt(
      "メモ",
      state.note
    );

  if (
    note === null
  ) {
    return;
  }

  state.currentWork =
    currentWork;

  state.nextTask =
    nextTask;

  state.note =
    note;

  state.updatedAt =
    new Date()
      .toISOString();

  saveProjectState(
    state
  );

  alert(
    "Project State保存完了"
  );

}

function changeSelectedTodoPriority() {

  const list =
    getTodoList();

  const selected =
    [...selectedTodoIndexes];

  if (!selected.length) {
    alert("優先度を変更するTODOを選択してください");
    return;
  }

  const value =
    prompt(
      "優先度を入力してください\n\n" +
      "1: high（高）\n" +
      "2: middle（中）\n" +
      "3: low（低）",
      "2"
    );

  if (value === null) {
    return;
  }

  const map = {
    "1": "high",
    "2": "middle",
    "3": "low",
    high: "high",
    middle: "middle",
    low: "low"
  };

  const priority =
    map[String(value).trim()];

  if (!priority) {
    alert("優先度が正しくありません");
    return;
  }

  selected.forEach(index => {
    if (list[index]) {
      list[index].priority =
        priority;
    }
  });

  localStorage.setItem(
    "todoList",
    JSON.stringify(list)
  );

  selectedTodoIndexes.clear();

  renderTodoList();

  alert(
    selected.length +
    "件の優先度を変更しました"
  );
}

function completeTodosFromInput() {

  const box =
    get("todoCompleteInput");

  if (!box) {
    return;
  }

  completeTodosByText(
    box.value
  );

  box.value = "";
}

function completeTodosByText(text) {

  if (!String(text || "").trim()) {
    alert("完了したTODOを入力してください");
    return;
  }

  const targets =
    String(text)
      .split("\n")
      .map(line =>
        normalizeTodoText(line)
      )
      .filter(Boolean);

  const list =
    getTodoList();

  let count = 0;

  list.forEach(todo => {

    const todoText =
      normalizeTodoText(todo.text);

    const matched =
      targets.some(target =>
        todoText === target ||
        todoText.includes(target) ||
        target.includes(todoText)
      );

    if (matched && !todo.done) {
      todo.done = true;
      count++;
    }

  });

  localStorage.setItem(
    "todoList",
    JSON.stringify(list)
  );

  renderTodoList();

  alert(count + "件を完了にしました");
}

function getPriorityIcon(priority) {

  switch (priority) {

    case "high":
      return "🔥";

    case "low":
      return "📝";

    default:
      return "⚡";

  }

}

function mergeSelectedTodos() {

  const list =
    getTodoList();

  const selectedIndexes =
    [...selectedTodoIndexes];

  const selected =
    selectedIndexes.map(
      index => list[index]
    );

  if (selected.length < 2) {

    alert(
      "統合するTODOを2件以上選択してください"
    );

    return;

  }

  const defaultText =
    selected
      .map(item => item.text)
      .join(" / ");

  const mergedText =
    prompt(
      "統合後のTODO名を入力してください",
      defaultText
    );

  if (!mergedText) {
    return;
  }

  const normalized =
    normalizeTodoText(
      mergedText
    );

  if (!normalized) {
    return;
  }

  const ok =
    confirm(
      "選択したTODOを統合しますか？\n\n"
      +
      selected
        .map(
          x => "・" + x.text
        )
        .join("\n")
      +
      "\n\n↓\n\n"
      +
      normalized
    );

  if (!ok) {
    return;
  }

  const next =
    list.filter(
      (_, index) =>
        !selectedTodoIndexes.has(index)
    );

  next.unshift({

    text: normalized,

    done: false,

    priority: "middle",

    selected: false,

    created_at:
      new Date()
        .toISOString(),

    merged_from:

      selected.flatMap(
        item =>

          item.merged_from
          ? item.merged_from
          : [item.text]

      )

  });

  localStorage.setItem(
    "todoList",
    JSON.stringify(next)
  );

  selectedTodoIndexes.clear();

  renderTodoList();

}

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

  const priorityOrder = {

    high: 0,
    middle: 1,
    low: 2

  };

  return list
    .map((item,index)=>({

      ...item,

      _index:index

    }))
    .sort((a,b)=>{

      if (a.done !== b.done) {
        return a.done ? 1 : -1;
      }

      return (
        (priorityOrder[a.priority] ?? 1)
        -
        (priorityOrder[b.priority] ?? 1)
      );

    });

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

  <button onclick="changeSelectedTodoPriority()">
    🔥
  </button>

  <button onclick="toggleSelectAllTodos()">
    ☑
  </button>

  <button onclick="copySelectedTodos()">
    📋
  </button>

  <button onclick="mergeSelectedTodos()">
    🔗
  </button>

  <button onclick="generateHandoffPrompt()">
  📄
  </button>

  <button onclick="deleteSelectedTodos()">
    🗑
  </button>

</div>

<div class="todo-complete-box">

  <textarea
    id="todoCompleteInput"
    rows="3"
    placeholder="完了したTODOを貼り付け"
  ></textarea>

  <button onclick="completeTodosFromInput()">
    ✅ 貼り付け分を完了
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
    ${getPriorityIcon(x.priority)}${x.merged_from ? "🔗 " : ""}${escapeHtml(x.text)}
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

        priority: "middle",

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

  if (todoDetailOpening) {
    return;
  }

  todoDetailOpening = true;

  const list =
    getTodoList();

  const item =
    list[index];

  if (!item) {
    todoDetailOpening = false;
    return;
  }

  let detail =
    item.text;

  detail +=
    "\n\n優先度: " +
    (item.priority || "middle");

  if (
    Array.isArray(item.merged_from) &&
    item.merged_from.length
  ) {
    detail +=
      "\n\n統合元:\n" +
      item.merged_from
        .map(x => "・" + x)
        .join("\n");
  }

  alert(detail);

  setTimeout(() => {
    todoDetailOpening = false;
  }, 500);
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

function generateHandoffPrompt() {

  const list =
    getTodoList();

  const done =
    list.filter(
      item => item.done
    );

  const undone =
    getSortedTodoList(
      list.filter(
        item => !item.done
      )
    );

  const topPriority =
    undone.filter(
      x => x.priority === "high"
    );

  const text =

`以下の内容をもとに、
次チャットへ引き継ぐための
開発プロンプトを作成したい。

【プロジェクト】

AIプロンプト生成Pro

【現在の状態】

・HTML HEALTH 100/100
・JS Syntax OK
・duplicate function none
・undefined onclick none

【完了済み】

${
done.length
? done
    .map(
      x =>
      "✔ " + x.text
    )
    .join("\n")
: "なし"
}

【未完了】

${
undone.length
? undone
    .map(x => {

      const icon =
        getPriorityIcon(
          x.priority
        );

      return (
        icon +
        " " +
        x.text
      );

    })
    .join("\n")
: "なし"
}

【最優先】

${
topPriority.length
? topPriority
    .map(
      x =>
      "🔥 " + x.text
    )
    .join("\n")
: "なし"
}

【やりたいこと】

未完了TODOの中から
優先度の高いものを順に実装したい。

既存機能は壊したくない。

function単位で
追加・削除・更新内容を
明示してほしい。

実装後は
HTML HEALTHで確認したい。

【出力してほしい内容】

・現状整理
・次にやるべきこと
・修正対象function
・追加内容
・削除内容
・更新内容
・動作確認方法

【トーン】

プロフェッショナル
実務的
簡潔
`;

  copyTextFallback(
    text
  );

  alert(
    "引き継ぎ内容をコピーしました"
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