/* ===============================
   FILE: 11_mobile_console.js
   Mobile Debug Console
=============================== */
let mobileConsoleLogs = [];

let mobileConsoleInitialized = false;

let devConsoleResult = "";

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

  <button onclick="pasteDevConsoleInput()">
    📋 Paste
  </button>

  <button onclick="executeDevConsole()">
    ▶ Run
  </button>

  <button onclick="pasteAndRunDevConsole()">
    ⚡ Paste&Run
  </button>

  <button onclick="clearDevConsoleInput()">
    🗑 Clear
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

<textarea
  id="devConsoleInput"
  rows="8"
  onfocus="setVirtualKeyboardTarget('devConsoleInput')"
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

<div class="small" style="margin-top:8px;">
Quick Command
</div>

<div class="float-panel-actions">
  ${buildDevConsoleQuickCommands()}
</div>

<div class="virtual-keyboard">

<button onclick="insertVirtualKeyboardText('(')">(</button>
<button onclick="insertVirtualKeyboardText(')')">)</button>
<button onclick="insertVirtualKeyboardText('{')">{</button>
<button onclick="insertVirtualKeyboardText('}')">}</button>
<button onclick="insertVirtualKeyboardText('[')">[</button>
<button onclick="insertVirtualKeyboardText(']')">]</button>
<button onclick="insertVirtualKeyboardText('=>')">=&gt;</button>
<button onclick="insertVirtualKeyboardText('&&')">&amp;&amp;</button>
<button onclick="insertVirtualKeyboardText('||')">||</button>
<button onclick="moveVirtualKeyboardCursor(-1)">◀</button>
<button onclick="moveVirtualKeyboardCursor(1)">▶</button>
<button onclick="virtualKeyboardBackspace()">⌫</button>
<button onclick="virtualKeyboardDelete()">Del</button>

</div>

<div id="devConsoleSuggestion">
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
      `[${log.time}] ${log.type}\\n${log.text}`
    )
    .join("\\n\\n") || "ログなし"
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

async function pasteDevConsoleInput() {

  const input =
    get("devConsoleInput");

  if (!input) {
    alert("入力欄なし");
    return false;
  }

  if (
    !navigator.clipboard ||
    !navigator.clipboard.readText
  ) {
    alert("クリップボード読取に未対応です");
    return false;
  }

  try {

    const text =
      await navigator.clipboard.readText();

    input.value =
      text || "";

    input.focus();

    input.selectionStart =
      input.selectionEnd =
        input.value.length;

    localStorage.setItem(
      "devConsoleLastInput",
      input.value
    );

    updateDevConsoleSuggestions();

    return true;

  } catch (e) {

    alert(
      "貼り付け失敗\n\n" +
      e.message
    );

    return false;

  }

}

function clearDevConsoleInput() {

  const input =
    get("devConsoleInput");

  if (!input) {
    return;
  }

  input.value = "";

  localStorage.setItem(
    "devConsoleLastInput",
    ""
  );

  input.focus();

  updateDevConsoleSuggestions();

}

async function pasteAndRunDevConsole() {

  const ok =
    await pasteDevConsoleInput();

  if (!ok) {
    return;
  }

  executeDevConsole();

}