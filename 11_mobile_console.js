/* ===============================
   FILE: 11_mobile_console.js
   Mobile Debug Console
=============================== */
let mobileConsoleLogs = [];

let mobileConsoleInitialized = false;

let devConsoleResult = "";

let devConsoleHistory =
  loadJson(
    "devConsoleHistory",
    []
  );

let devConsoleFavorites =
  loadJson(
    "devConsoleFavorites",
    []
  );

let devConsoleQuickButtons =
  loadJson(
    "devConsoleQuickButtons",
    [
      {
        title: "typeof",
        code: "typeof "
      },
      {
        title: "Function",
        code: "showFunctionList()"
      },
      {
        title: "Module",
        code: "generateModuleAnalyzer()"
      },
      {
        title: "Relation",
        code: "showFunctionRelationMap()"
      },
      {
        title: "Health",
        code: "showHtmlHealth()"
      },
      {
        title: "Search",
        code: "searchAllRepairFiles()"
      },
      {
        title: "Console",
        code: "showMobileConsole()"
      },
      {
        title: "Blocks",
        code: "JSON.stringify(extractFunctionBlocksFromText(get(\"repairEditor\").value)[0], null, 2)"
      },
      {
        title: "Unused",
        code: "cleanupCandidates()"
      },
      {
        title: "Clear",
        code: "clearMobileConsole()"
      }
    ]
  );



function initMobileConsole() {

  if (mobileConsoleInitialized) {
    return;
  }

  mobileConsoleInitialized = true;

  hookMobileConsoleLog();
  hookMobileConsoleError();

}

function hookMobileConsoleLog() {

  ["log", "warn", "error"].forEach(type => {

    const original =
      console[type];

    console[type] =
      function(...args) {

        original.apply(
          console,
          args
        );

        addMobileConsoleLog(
          type,
          args.map(x =>
            typeof x === "object"
              ? JSON.stringify(x, null, 2)
              : String(x)
          ).join(" ")
        );

      };

  });

}

function hookMobileConsoleError() {

  window.addEventListener(
    "error",
    event => {

      addMobileConsoleLog(
        "error",
        [
          event.message,
          "line:" + event.lineno,
          "column:" + event.colno,
          event.filename
        ].join("\n")
      );

    }
  );

}

function addMobileConsoleLog(type, text) {

  mobileConsoleLogs.push({
    type,
    text,
    time:
      new Date().toLocaleTimeString()
  });

  if (mobileConsoleLogs.length > 100) {
    mobileConsoleLogs.shift();
  }

}

function showMobileConsole() {

  openFloatPanel(
    "Mobile Dev Console",
    `
<div class="float-panel-actions">

  <button onclick="executeDevConsole()">
    ▶ 実行
  </button>

  <button onclick="saveDevConsoleFavorite()">
    ⭐ 保存
  </button>

  <button onclick="showDevConsoleFavorites()">
    📂 Favorite
  </button>

  <button onclick="copyDevConsoleResult()">
    📋 結果
  </button>

  <button onclick="showDevConsoleHistory()">
    🕘 履歴
  </button>

  <button onclick="clearMobileConsole()">
    🧹 ログ
  </button>

</div>

<div class="small" style="margin-top:8px;">
Quick Command
</div>

<div class="float-panel-actions">

  ${buildDevConsoleQuickCommands()}

</div>

<textarea
  id="devConsoleInput"
  rows="8"
  oninput="updateDevConsoleSuggestions()"
  style="
    width:100%;
    font-family:monospace;
    font-size:12px;
    white-space:pre;
  "
  placeholder="JavaScriptを入力"
>${escapeHtml(
  localStorage.getItem("devConsoleLastInput") ||
  "typeof startMacroRecording"
)}</textarea>

<div
  id="devConsoleSuggestion">
</div>

<div class="small" style="margin-top:8px;">
実行結果
</div>

<textarea
  id="devConsoleResult"
  rows="10"
  readonly
  style="
    width:100%;
    font-family:monospace;
    font-size:12px;
    white-space:pre;
  "
>${escapeHtml(
  devConsoleResult || ""
)}</textarea>

<div class="small" style="margin-top:8px;">
Console Log
</div>

<pre class="code-preview">
${escapeHtml(
  mobileConsoleLogs
    .map(log =>
      `[${log.time}] ${log.type}\n${log.text}`
    )
    .join("\n\n") || "ログなし"
)}
</pre>
`
  );

}

function copyMobileConsole() {

  const text =
    mobileConsoleLogs.map(log =>
      `[${log.time}] ${log.type}\n${log.text}`
    ).join("\n\n");

  copyTextFallback(text);

  alert("Consoleログをコピーしました");

}

function clearMobileConsole() {

  mobileConsoleLogs = [];

  showMobileConsole();

}

function checkFunctionExistsPrompt() {

  const name =
    prompt(
      "確認する関数名",
      "startMacroRecording"
    );

  if (!name) {
    return;
  }

  alert(
    name +
    " : " +
    typeof window[name]
  );

}

function runMobileConsoleEval() {

  const code =
    prompt(
      "実行するJS",
      "typeof startMacroRecording"
    );

  if (!code) {
    return;
  }

  try {

    const result =
      Function(
        "return (" + code + ")"
      )();

    if (
      typeof result === "object" &&
      result !== null
    ) {
      alert(
        JSON.stringify(
          result,
          null,
          2
        )
      );
      return;
    }

    alert(
      String(result)
    );

  } catch (e) {

    alert(
      "実行エラー\n\n" +
      e.message
    );

  }

}

let mobileConsoleHistory =
  JSON.parse(
    localStorage.getItem("mobileConsoleHistory") ||
    "[]"
  );

let mobileConsoleHistoryIndex =
  -1;

function saveMobileConsoleHistory(code) {

  if (!code || !code.trim()) {
    return;
  }

  mobileConsoleHistory =
    mobileConsoleHistory.filter(item =>
      item !== code
    );

  mobileConsoleHistory.unshift(code);

  if (mobileConsoleHistory.length > 30) {
    mobileConsoleHistory.length = 30;
  }

  localStorage.setItem(
    "mobileConsoleHistory",
    JSON.stringify(mobileConsoleHistory)
  );

}

function showMobileConsoleHistory() {

  if (!mobileConsoleHistory.length) {
    alert("履歴なし");
    return;
  }

  alert(
    mobileConsoleHistory
      .map((item, index) =>
        (index + 1) + ". " + item
      )
      .join("\n\n")
  );

}

function executeDevConsole() {

  const input =
    get("devConsoleInput");

  const resultBox =
    get("devConsoleResult");

  if (!input) {
    alert("入力欄なし");
    return;
  }

  const code =
    input.value.trim();

  if (!code) {
    alert("実行コードなし");
    return;
  }

  localStorage.setItem(
    "devConsoleLastInput",
    code
  );

  saveDevConsoleHistory(code);

  const logs = [];

  const originalLog =
    console.log;

  const originalWarn =
    console.warn;

  const originalError =
    console.error;

  function capture(type, args) {

    logs.push(
      "[" + type + "] " +
      args.map(formatDevConsoleValue)
        .join(" ")
    );

  }

  try {

    console.log =
      function(...args) {
        capture("log", args);
        originalLog.apply(console, args);
      };

    console.warn =
      function(...args) {
        capture("warn", args);
        originalWarn.apply(console, args);
      };

    console.error =
      function(...args) {
        capture("error", args);
        originalError.apply(console, args);
      };

    let result;

    try {

      result =
        Function(
          `"use strict";
return (
${code}
);`
        )();

    } catch (expressionError) {

      result =
        Function(
          `"use strict";
${code}
`
        )();

    }

    const output = [];

    if (logs.length) {
      output.push("=== Console ===");
      output.push(logs.join("\n"));
      output.push("");
    }

    output.push("=== Result ===");
    output.push(
      formatDevConsoleValue(result)
    );

    devConsoleResult =
      output.join("\n");

  } catch (e) {

    devConsoleResult =
      [
        "=== Error ===",
        e.name + ": " + e.message,
        "",
        e.stack || ""
      ].join("\n");

  } finally {

    console.log =
      originalLog;

    console.warn =
      originalWarn;

    console.error =
      originalError;

  }

  if (resultBox) {
    resultBox.value =
      devConsoleResult;
  }

}

function formatDevConsoleValue(value) {

  if (value === undefined) {
    return "undefined";
  }

  if (value === null) {
    return "null";
  }

  if (
    typeof value === "object" ||
    typeof value === "function"
  ) {

    try {
      return JSON.stringify(
        value,
        null,
        2
      );
    } catch (e) {
      return String(value);
    }

  }

  return String(value);

}

function copyDevConsoleResult() {

  const box =
    get("devConsoleResult");

  const text =
    box && box.value
      ? box.value
      : devConsoleResult;

  if (!text) {
    alert("コピー内容なし");
    return;
  }

  const ok =
    copyTextFallback(text);

  alert(
    ok
      ? "実行結果をコピーしました"
      : "コピー失敗"
  );

}

function saveDevConsoleHistory(code) {

  if (!code) {
    return;
  }

  devConsoleHistory =
    devConsoleHistory.filter(item =>
      item.code !== code
    );

  devConsoleHistory.unshift({
    code,
    time:
      new Date().toLocaleString()
  });

  if (devConsoleHistory.length > 100) {
    devConsoleHistory =
      devConsoleHistory.slice(0, 100);
  }

  localStorage.setItem(
    "devConsoleHistory",
    JSON.stringify(devConsoleHistory)
  );

}

function showDevConsoleHistory() {

  if (
    !devConsoleHistory ||
    !devConsoleHistory.length
  ) {
    alert("履歴なし");
    return;
  }

  openFloatPanel(
    "Dev Console 履歴",
    `
<div class="float-panel-actions">
  <button onclick="clearDevConsoleHistory()">
    🧹 履歴クリア
  </button>
  <button onclick="showMobileConsole()">
    ↩ Console
  </button>
</div>

<div class="macro-list">
${
  devConsoleHistory.map((item, index) => `
<div class="macro-row">

<button
  class="macro-mini-btn"
  onclick="runDevConsoleHistory(${index})">
  ▶
</button>

<span class="macro-name">
  ${escapeHtml(item.code)}
</span>

</div>
`).join("")
}
</div>
`
  );

}

function runDevConsoleHistory(index) {

  const item =
    devConsoleHistory[index];

  if (!item) {
    alert("履歴なし");
    return;
  }

  showMobileConsole();

  setTimeout(() => {

    const input =
      get("devConsoleInput");

    if (input) {
      input.value =
        item.code;
    }

  }, 0);

}

function clearDevConsoleHistory() {

  if (
    !confirm("Dev Console履歴を削除しますか？")
  ) {
    return;
  }

  devConsoleHistory = [];

  localStorage.setItem(
    "devConsoleHistory",
    JSON.stringify(devConsoleHistory)
  );

  showMobileConsole();

}

function saveDevConsoleFavorite() {

  const input =
    get("devConsoleInput");

  if (!input) {
    return;
  }

  const code =
    input.value.trim();

  if (!code) {
    alert("保存するコードがありません");
    return;
  }

  const name =
    prompt(
      "お気に入り名",
      code.split("\n")[0]
    );

  if (!name) {
    return;
  }

  devConsoleFavorites =
    devConsoleFavorites.filter(
      item =>
        item.name !== name
    );

  devConsoleFavorites.unshift({

    name,

    code

  });

  localStorage.setItem(
    "devConsoleFavorites",
    JSON.stringify(
      devConsoleFavorites
    )
  );

  alert("保存しました");

}

function showDevConsoleFavorites() {

  openFloatPanel(

    "Dev Console Favorite",

    `
<div class="float-panel-actions">

<button onclick="showMobileConsole()">
↩ 戻る
</button>

</div>

<div class="macro-list">

${
devConsoleFavorites.map(

(item,index)=>`

<div class="macro-row">

<button
class="macro-mini-btn"
onclick="runDevConsoleFavorite(${index})">
▶
</button>

<button
class="macro-mini-btn"
onclick="deleteDevConsoleFavorite(${index})">
🗑
</button>

<span class="macro-name">

${escapeHtml(item.name)}

</span>

</div>

`

).join("")
}

</div>

`

  );

}

function runDevConsoleFavorite(index) {

  const item =
    devConsoleFavorites[index];

  if (!item) {
    return;
  }

  showMobileConsole();

  setTimeout(() => {

    const input =
      get("devConsoleInput");

    if (!input) {
      return;
    }

    input.value =
      item.code;

  },100);

}

function deleteDevConsoleFavorite(index) {

  devConsoleFavorites.splice(
    index,
    1
  );

  localStorage.setItem(

    "devConsoleFavorites",

    JSON.stringify(
      devConsoleFavorites
    )

  );

  showDevConsoleFavorites();

}

function buildDevConsoleQuickCommands() {

  return (
    devConsoleQuickButtons
      .map(item => `

<button
  onclick='insertDevConsoleCommand(${JSON.stringify(item.code)})'>
  ${escapeHtml(item.title)}
</button>

`).join("")

    +

`
<button
  onclick="showDevConsoleQuickEditor()">
  ⚙
</button>
`
  );

}

function insertDevConsoleCommand(
  text
) {

  const input =
    get("devConsoleInput");

  if (!input) {
    return;
  }

  const value =
    input.value;

  const pos =
    input.selectionStart;

  const left =
    value.slice(
      0,
      pos
    );

  const right =
    value.slice(
      pos
    );

  const replaced =
    left.replace(
      /[A-Za-z0-9_$]*$/,
      text
    );

  input.value =
    replaced +
    "()" +
    right;

  input.focus();

  input.selectionStart =
    replaced.length + 1;

  input.selectionEnd =
    replaced.length + 1;

  localStorage.setItem(
    "devConsoleLastInput",
    input.value
  );

  updateDevConsoleSuggestions();

}

function getDevConsoleSuggestions(
  keyword
) {

  keyword =
    String(keyword || "")
      .trim();

  if (!keyword) {
    return [];
  }

  const names =
    extractFunctionNames(
      get("repairEditor")
        ?.value || ""
    );

  return names
    .filter(name =>
      name
        .toLowerCase()
        .startsWith(
          keyword.toLowerCase()
        )
    )
    .slice(0, 15);

}

function updateDevConsoleSuggestions() {

  const input =
    get("devConsoleInput");

  const list =
    get("devConsoleSuggestion");

  if (!input || !list) {
    return;
  }

  const word =
    input.value
      .split(/[^A-Za-z0-9_$]/)
      .pop();

  const items =
    getDevConsoleSuggestions(
      word
    );

  list.innerHTML =
    items.map(name => `
<div
class="search-result-line"
onclick="
insertDevConsoleCommand(
'${name}'
)
">
${escapeHtml(name)}
</div>
`).join("");

}

function saveDevConsoleQuickButtons() {

  localStorage.setItem(

    "devConsoleQuickButtons",

    JSON.stringify(
      devConsoleQuickButtons
    )

  );

}

function showDevConsoleQuickEditor() {

  openFloatPanel(
    "Quick Command",
    `
<div class="macro-list">
${
  devConsoleQuickButtons.map((item, index) => `
<div class="macro-row">

<button
  class="macro-mini-btn"
  onclick="moveDevConsoleQuickUp(${index})">
  ⬆
</button>

<button
  class="macro-mini-btn"
  onclick="moveDevConsoleQuickDown(${index})">
  ⬇
</button>

<button
  class="macro-mini-btn"
  onclick="editDevConsoleQuick(${index})">
  ✏
</button>

<button
  class="macro-mini-btn"
  onclick="deleteDevConsoleQuick(${index})">
  🗑
</button>

<span class="macro-name">
  ${escapeHtml(item.title)}
</span>

</div>
`).join("")
}
</div>

<hr>

<button
  class="float-list-btn"
  onclick="addDevConsoleQuick()">
  ➕ 追加
</button>
`
  );

}

function addDevConsoleQuick() {

  const title =
    prompt(
      "ボタン名",
      "New"
    );

  if (!title) {
    return;
  }

  const code =
    prompt(
      "実行コード",
      "showHtmlHealth()"
    );

  if (!code) {
    return;
  }

  devConsoleQuickButtons.push({
    title,
    code
  });

  saveDevConsoleQuickButtons();

  showDevConsoleQuickEditor();

}

function editDevConsoleQuick(index) {

  const item =
    devConsoleQuickButtons[index];

  if (!item) {
    return;
  }

  const title =
    prompt(
      "ボタン名",
      item.title || ""
    );

  if (!title) {
    return;
  }

  const code =
    prompt(
      "実行コード",
      item.code || ""
    );

  if (!code) {
    return;
  }

  devConsoleQuickButtons[index] = {
    title,
    code
  };

  saveDevConsoleQuickButtons();

  showDevConsoleQuickEditor();

}

function deleteDevConsoleQuick(index) {

  const item =
    devConsoleQuickButtons[index];

  if (!item) {
    return;
  }

  if (
    !confirm(
      "削除しますか？\n\n" +
      item.title
    )
  ) {
    return;
  }

  devConsoleQuickButtons.splice(
    index,
    1
  );

  saveDevConsoleQuickButtons();

  showDevConsoleQuickEditor();

}

function moveDevConsoleQuickUp(index) {

  if (index <= 0) {
    return;
  }

  [
    devConsoleQuickButtons[index - 1],
    devConsoleQuickButtons[index]
  ] = [
    devConsoleQuickButtons[index],
    devConsoleQuickButtons[index - 1]
  ];

  saveDevConsoleQuickButtons();

  showDevConsoleQuickEditor();

}

function moveDevConsoleQuickDown(index) {

  if (
    index >=
    devConsoleQuickButtons.length - 1
  ) {
    return;
  }

  [
    devConsoleQuickButtons[index],
    devConsoleQuickButtons[index + 1]
  ] = [
    devConsoleQuickButtons[index + 1],
    devConsoleQuickButtons[index]
  ];

  saveDevConsoleQuickButtons();

  showDevConsoleQuickEditor();

}

function getDevConsoleSuggestions(
  keyword
) {

  keyword =
    String(keyword || "")
      .trim()
      .toLowerCase();

  if (!keyword) {
    return [];
  }

  return getDevConsoleCandidates()
    .filter(name =>
      name
        .toLowerCase()
        .includes(keyword)
    )
    .slice(0, 20);

}

function updateDevConsoleSuggestions() {

  const input =
    get("devConsoleInput");

  const box =
    get("devConsoleSuggestion");

  if (!input || !box) {
    return;
  }

  const pos =
    input.selectionStart || input.value.length;

  const left =
    input.value.slice(0, pos);

  const keyword =
    left
      .split(/[^A-Za-z0-9_$]/)
      .pop();

  if (!keyword) {
    box.innerHTML = "";
    return;
  }

  const list =
    getDevConsoleSuggestions(
      keyword
    );

  box.innerHTML =
    list.map(name => `

<div
  class="search-result-line"
  onclick='insertDevConsoleSuggestion(${JSON.stringify(name)})'>
  ${escapeHtml(name)}
</div>

`).join("");

}

function insertDevConsoleCommand(code) {

  const input =
    get("devConsoleInput");

  if (!input) {
    return;
  }

  input.value =
    code;

  input.focus();

  input.selectionStart =
    input.selectionEnd =
      input.value.length;

  localStorage.setItem(
    "devConsoleLastInput",
    input.value
  );

  updateDevConsoleSuggestions();

}

function insertDevConsoleSuggestion(name) {

  const input =
    get("devConsoleInput");

  if (!input) {
    return;
  }

  const value =
    input.value;

  const pos =
    input.selectionStart || value.length;

  const left =
    value.slice(0, pos);

  const right =
    value.slice(pos);

  const replacedLeft =
    left.replace(
      /[A-Za-z0-9_$]*$/,
      name
    );

  input.value =
    replacedLeft +
    "()" +
    right;

  const cursorPos =
    replacedLeft.length + 1;

  input.focus();

  setTimeout(() => {

    input.selectionStart =
      cursorPos;

    input.selectionEnd =
      cursorPos;

  }, 0);

  localStorage.setItem(
    "devConsoleLastInput",
    input.value
  );

  updateDevConsoleSuggestions();

}

function getDevConsoleCandidates() {

  const editor =
    get("repairEditor");

  if (!editor) {
    return [];
  }

  const names =
    extractFunctionNames(
      editor.value
    );

  return [
    ...new Set(names)
  ].sort();

}


