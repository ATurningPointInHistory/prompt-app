/* ===============================
   FILE: 04_tools.js
   Tools
=============================== */

/* ===============================
   TODO Management
=============================== */

let todoDetailOpening = false;

let selectedTodoIndexes = new Set();

function getSelectedTodoTitle() {

  const list =
    getTodoList();

  const selected =
    [...selectedTodoIndexes]
      .map(index => list[index])
      .filter(Boolean);

  if (!selected.length) {
    return "開発ログ";
  }

  return selected
    .map(item => item.text)
    .join(" / ")
    .slice(0, 40);

}

function saveDevLogFromAiAnswer() {

  const text =
    prompt(
      "AI回答や作業メモを貼り付けてください",
      ""
    );

  if (!text) {
    return;
  }

  const title =
    guessDevLogTitle(text);

  const changes =
    extractDevLogChanges(text);

  const result =
    extractDevLogResult(text);

  const next =
    extractDevLogNext(text);

  const content =

`【変更内容】
${changes}

【結果】
${result}

【次にやること】
${next}

【元テキスト】
${text}`;

  saveDevLog({

    title,

    content,

    created_at:
      new Date()
        .toISOString()

  });

  alert(
    "AI回答から開発ログを保存しました"
  );

}

function getDevLogList() {

  return loadJson(
    "devLogList",
    []
  );

}

function saveDevLog(log) {

  const list =
    getDevLogList();

  list.unshift(log);

  localStorage.setItem(
    "devLogList",
    JSON.stringify(
      list.slice(0,100)
    )
  );

}

function saveDevLogFromInput() {

  const title =

    prompt(
      "作業名",
      getSelectedTodoTitle()
    );

  if (!title) {
    return;
  }

  const content =

    prompt(
      "変更内容・結果・次やること",
      ""
    );

  if (!content) {
    return;
  }

  saveDevLog({

    title,

    content,

    created_at:
      new Date()
        .toISOString()

  });

  alert(
    "開発ログを保存しました"
  );

}

function renderDevLogList() {

  const list =
    getDevLogList();

  openFloatPanel(

    "開発ログ履歴",

    `
<div class="float-panel-actions devlog-actions">

<button
class="float-list-btn"
onclick="saveDevLogFromInput()">
➕ 手動追加
</button>

<button
class="float-list-btn"
onclick="saveDevLogFromAiAnswer()">
🤖 AI回答→DevLog
</button>

</div>

<div>

${
list.length

? list.map((x,i)=>`

<div class="backup-history-item">

<div>

<b>
${escapeHtml(x.title)}
</b>

<br>

<small>
${escapeHtml(
  x.created_at || ""
)}
</small>

</div>

<div>

<button
onclick="copyDevLog(${i})">
📋
</button>

<button
onclick="deleteDevLog(${i})">
🗑
</button>

</div>

</div>

`).join("")

: "履歴なし"

}

</div>
`

  );

}

function copyDevLog(index) {

  const list =
    getDevLogList();

  const item =
    list[index];

  if (!item) {
    return;
  }

  copyTextFallback(

`作業名
${item.title}

内容
${item.content}`

  );

}

function deleteDevLog(index) {

  const list =
    getDevLogList();

  list.splice(
    index,
    1
  );

  localStorage.setItem(

    "devLogList",

    JSON.stringify(list)

  );

  renderDevLogList();

}

function guessDevLogTitle(text) {

  const firstLine =
    String(text || "")
      .split("\n")
      .map(x => x.trim())
      .find(Boolean);

  if (!firstLine) {
    return "開発ログ";
  }

  return firstLine
    .replace(/[。\.].*$/, "")
    .slice(0, 30);

}

function extractDevLogChanges(text) {

  return String(text || "")
    .split(/[。\n]/)
    .map(x => x.trim())
    .filter(x =>
      x.includes("追加") ||
      x.includes("変更") ||
      x.includes("更新") ||
      x.includes("修正") ||
      x.includes("削除")
    )
    .join("\n") || "未整理";

}

function extractDevLogResult(text) {

  return String(text || "")
    .split(/[。\n]/)
    .map(x => x.trim())
    .filter(x =>
      x.includes("OK") ||
      x.includes("正常") ||
      x.includes("100") ||
      x.includes("確認") ||
      x.includes("エラーなし")
    )
    .join("\n") || "未記録";

}

function extractDevLogNext(text) {

  return String(text || "")
    .split(/[。\n]/)
    .map(x => x.trim())
    .filter(x =>
      x.includes("次") ||
      x.includes("次は") ||
      x.includes("次に")
    )
    .join("\n") || "未設定";

}

function getAiMemoryList() {

  return loadJson(
    "aiMemoryList",
    []
  );

}

function saveAiMemory(
  title,
  content
) {

  const list =
    getAiMemoryList();

  list.unshift({

    title,

    content,

    created_at:
      new Date()
        .toISOString()

  });

  localStorage.setItem(
    "aiMemoryList",
    JSON.stringify(list)
  );

}

function saveCurrentAiAnswer() {

  const output =
    get("output")
      ?.innerText
      ?.trim();

  if (
    !output ||
    output === "ここに表示"
  ) {
    alert(
      "保存する回答がありません"
    );
    return;
  }

  const title =
    prompt(
      "保存名",
      "AI回答"
    );

  if (!title) {
    return;
  }

  saveAiMemory(
    title,
    output
  );

  alert(
    "AI回答を保存しました"
  );
}

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
      return "[1]";

    case "low":
      return "[3]";

    default:
      return "[2]";

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

function toggleTodoMenu(type) {

  const manage =
    get("todoManageMenu");

  const action =
    get("todoActionMenu");

  if (type === "manage") {

    manage.style.display =
      manage.style.display === "flex"
        ? "none"
        : "flex";

    action.style.display = "none";
  }

  if (type === "action") {

    action.style.display =
      action.style.display === "flex"
        ? "none"
        : "flex";

    manage.style.display = "none";
  }
}

function renderTodoList() {

  const list =
    getTodoList();

  const sortedList =
    getSortedTodoList(list);

  openFloatPanel(
    "開発TODO",

    `
<div class="todo-toolbar-top">

  <button
    onclick="toggleTodoMenu('manage')">
    管理 ▼
  </button>

  <button
    onclick="toggleTodoMenu('action')">
    操作 ▼
  </button>

</div>

<div
  id="todoManageMenu"
  class="todo-menu-grid"
  style="display:none;">

  <button onclick="promptAddTodoItems()">
    TODO
  </button>

  <button onclick="changeSelectedTodoPriority()">
    優先度
  </button>

  <button onclick="toggleSelectAllTodos()">
    全選択
  </button>

  <button onclick="deleteSelectedTodos()">
    削除
  </button>

</div>

<div
  id="todoActionMenu"
  class="todo-menu-grid"
  style="display:none;">

  <button onclick="copySelectedTodos()">
    コピー
  </button>

  <button onclick="mergeSelectedTodos()">
    統合
  </button>

  <button onclick="saveDevLogFromInput()">
    ログ
  </button>

  <button onclick="generateHandoffPrompt()">
    引継
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

function editTodoItem(index) {

  const list =
    getTodoList();

  const item =
    list[index];

  if (!item) {
    return;
  }

  const newText =
    prompt(
      "TODO内容を編集",
      item.text
    );

  if (newText === null) {
    return;
  }

  const normalized =
    normalizeTodoText(
      newText
    );

  if (!normalized) {
    alert("TODO内容が空です");
    return;
  }

  item.text =
    normalized;

  if (
    Array.isArray(item.merged_from)
  ) {

    const mergedText =
      prompt(
        "統合元を編集\n\n改行で複数入力",
        item.merged_from.join("\n")
      );

    if (mergedText !== null) {

      item.merged_from =
        mergedText
          .split("\n")
          .map(x =>
            normalizeTodoText(x)
          )
          .filter(Boolean);

    }

  }

  localStorage.setItem(
    "todoList",
    JSON.stringify(list)
  );

  renderTodoList();

  alert("TODOを更新しました");
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

  const ok =
    confirm(
      detail +
      "\n\nOKで編集します。"
    );

  if (ok) {
    editTodoItem(index);
  }

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
      "[1]" + x.text
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

  const text =
    String(editor.value || "");

  const lines =
    text.split(/\r?\n/);

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
      lines[i].length + 1;
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

  if (typeof updateLineNumbers === "function") {
    updateLineNumbers();
  }

  if (typeof updateCursorPosition === "function") {
    updateCursorPosition();
  }

  if (typeof updateRepairStatus === "function") {
    updateRepairStatus(
      "L" + targetLine + "へジャンプ"
    );
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

/* ===============================
   ProjectConfigManager
=============================== */

function openProjectConfigManager() {

  const config =
    getProjectConfig();

  openFloatPanel(
    "⚙ Project Config",
    `
<div class="float-panel-actions">

<button
onclick="saveProjectConfig()">
保存
</button>

<button
onclick="resetProjectConfig()">
初期化
</button>

<button onclick="exportProjectConfig()">
Export
</button>

<button onclick="importProjectConfig()">
Import
</button>

</div>

<textarea
id="projectConfigEditor"
style="
width:100%;
height:60vh;
font-family:monospace;
font-size:11px;
white-space:pre;
overflow:auto;
resize:vertical;
"
>${JSON.stringify(
{
  moduleRules:
    config.moduleRules,

  protectedFunctions:
    [...config.protectedFunctions],

  ignoreFunctionCalls:
    [...config.ignoreFunctionCalls],

  criticalFunctions:
    [...config.criticalFunctions]
},
null,
2
)}</textarea>
`
  );

}

function saveProjectConfig() {

  const editor =
    get("projectConfigEditor");

  if (!editor) {
    return;
  }

  try {

    const config =
      JSON.parse(
        editor.value
      );

    localStorage.setItem(
      "projectConfig",
      JSON.stringify(config)
    );

    alert(
      "ProjectConfig保存完了"
    );

  } catch (err) {

    alert(
      "JSONエラー\n\n" +
      err.message
    );

  }

}

function resetProjectConfig() {

  if (
    !confirm(
      "初期設定へ戻しますか？"
    )
  ) {
    return;
  }

  localStorage.removeItem(
    "projectConfig"
  );

  alert(
    "ProjectConfig初期化完了"
  );

  openProjectConfigManager();

}

function exportProjectConfig() {

  const config =
    getProjectConfig();

  const data = {
    moduleRules:
      config.moduleRules,

    protectedFunctions:
      [...config.protectedFunctions],

    ignoreFunctionCalls:
      [...config.ignoreFunctionCalls],

    criticalFunctions:
      [...config.criticalFunctions]
  };

  const blob =
    new Blob(
      [
        JSON.stringify(
          data,
          null,
          2
        )
      ],
      {
        type: "application/json"
      }
    );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href = url;
  a.download =
    "project_config.json";

  a.click();

  URL.revokeObjectURL(url);
}

function importProjectConfig() {

  const input =
    document.createElement("input");

  input.type = "file";
  input.accept = ".json,application/json";

  input.onchange = event => {

    const file =
      event.target.files &&
      event.target.files[0];

    if (!file) return;

    const reader =
      new FileReader();

    reader.onload = () => {

      try {

        const config =
          JSON.parse(reader.result);

        localStorage.setItem(
          "projectConfig",
          JSON.stringify(config)
        );

        alert(
          "ProjectConfigを読み込みました"
        );

        openProjectConfigManager();

      } catch (err) {

        alert(
          "ProjectConfig読込エラー\n\n" +
          err.message
        );

      }

    };

    reader.readAsText(file);
  };

  input.click();
}

window.openProjectConfigManager =
  openProjectConfigManager;

window.saveProjectConfig =
  saveProjectConfig;

window.resetProjectConfig =
  resetProjectConfig;

window.exportProjectConfig =
  exportProjectConfig;

window.importProjectConfig =
  importProjectConfig;

console.log("CHANGELOG");
console.table(CHANGELOG);