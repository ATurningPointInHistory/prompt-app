/* ===============================
   FILE: 11_mobile_console.js
   Mobile Debug Console
   IDE-010
=============================== */
let mobileConsoleLogs = [];

let mobileConsoleInitialized = false;

let devConsoleResult = "";

let devConsoleExecuting =
  false;

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

function buildDevConsoleToolbarHtml() {

  return `

<div class="small">
入力
</div>

<div class="float-panel-actions">

  <button onclick="pasteDevConsoleInput()">
    📋 Paste
  </button>

  <button onclick="clearDevConsoleInput()">
    🗑 Clear
  </button>

</div>

<div class="small" style="margin-top:6px;">
実行
</div>

<div class="float-panel-actions">

  <button onclick="executeDevConsole()">
    ▶ Run
  </button>

  <button onclick="pasteAndRunDevConsole()">
    ⚡ Paste&Run
  </button>

</div>

<div class="small" style="margin-top:6px;">
保存
</div>

<div class="float-panel-actions">

  <button onclick="saveDevConsoleFavorite()">
    ⭐ 保存
  </button>

  <button onclick="showFunctionHelpSearch()">
    📖 Function Help
  </button>

  <button onclick="showDevConsoleFavorites()">
    📂 Favorite
  </button>

  <button onclick="showDevConsoleHistory()">
    🕘 履歴
  </button>

</div>

<div class="small" style="margin-top:6px;">
出力
</div>

<div class="float-panel-actions">

  <button onclick="copyDevConsoleResult()">
    📋 結果
  </button>

  <button onclick="clearMobileConsole()">
    🧹 ログ
  </button>

</div>

`;

}

function buildDevConsoleInputHtml() {

  return `
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
  ""
)}</textarea>
`;

}

function buildDevConsoleSuggestionHtml() {

  return `
<div
  id="devConsoleSuggestion"
  class="dev-console-suggestion">
</div>
`;

}

function buildDevConsoleQuickCommandAreaHtml() {

  return `
<div class="small" style="margin-top:8px;">
Quick Command
</div>

<div class="float-panel-actions">

  ${buildDevConsoleQuickCommands()}

</div>
`;

}

function buildDevConsoleKeyboardHtml() {

  if (
    typeof buildVirtualKeyboardHtml ===
    "function"
  ) {
    return buildVirtualKeyboardHtml();
  }

  return `
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
`;

}

function buildDevConsoleResultHtml() {

  return `
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
`;

}

function buildDevConsoleLogHtml() {

  return `
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
`;

}

function buildMobileConsoleHtml() {

  return `
${buildDevConsoleToolbarHtml()}
${buildAnalyzeSourceSelectorHtml({
  label: "編集エリア"
})}
${buildDevConsoleInputHtml()}
${buildDevConsoleSuggestionHtml()}
${buildDevConsoleQuickCommandAreaHtml()}
${buildDevConsoleKeyboardHtml()}
${buildDevConsoleResultHtml()}
${buildDevConsoleLogHtml()}
`;

}

function showMobileConsole() {

  openFloatPanel(
    "Mobile Dev Console",
    buildMobileConsoleHtml()
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

/* ===============================
   Execute Dev Console
=============================== */

/* ===============================
   Execute Dev Console
=============================== */

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
    String(input.value || "")
      .trim();

  if (!code) {
    alert("実行コードなし");
    return;
  }

  if (devConsoleExecuting) {
    alert("コンソールを実行中です");
    return;
  }

  try {

    localStorage.setItem(
      "devConsoleLastInput",
      code
    );

    if (
      typeof saveDevConsoleHistory ===
      "function"
    ) {

      saveDevConsoleHistory(
        code
      );

    }

  } catch (error) {

    alert(
      "実行準備に失敗しました\n\n" +
      formatDevConsoleError(
        error
      )
    );

    return;

  }

  const context =
    createDevConsoleExecutionContext(
      resultBox
    );

  devConsoleExecuting =
    true;

  try {

    hookDevConsoleExecution(
      context
    );

    const result =
      executeDevConsoleSource(
        code
      );

    if (
      result &&
      typeof result.then ===
      "function"
    ) {

      executeDevConsoleAsync(
        context,
        result
      );

      return;

    }

    executeDevConsoleSync(
      context,
      result
    );

  } catch (error) {

    handleDevConsoleError(
      context,
      error
    );

  }

}

/* ===============================
   Create Dev Console Context
=============================== */

function createDevConsoleExecutionContext(
  resultBox
) {

  return {

    logs: [],

    startedAt:
      performance.now(),

    resultBox,

    originalConsole: {

      log:
        console.log,

      warn:
        console.warn,

      error:
        console.error

    }

  };

}

/* ===============================
   Finish Dev Console Execution
=============================== */

function finishDevConsoleExecution(
  context
) {

  console.log =
    context.originalConsole.log;

  console.warn =
    context.originalConsole.warn;

  console.error =
    context.originalConsole.error;

  devConsoleExecuting =
    false;

}

/* ===============================
   Build Dev Console Success Text
=============================== */

function buildDevConsoleSuccessText(
  context,
  result
) {

  const lines = [];

  if (context.logs.length) {

    lines.push(
      "=== Console ==="
    );

    lines.push(
      context.logs.join("\n")
    );

  }

  if (
    result !== undefined ||
    !context.logs.length
  ) {

    if (lines.length) {
      lines.push("");
    }

    lines.push(
      "=== Result ==="
    );

    lines.push(
      formatDevConsoleValue(
        result
      )
    );

  }

  lines.push("");

  lines.push(
    "Execution: " +
    (
      performance.now() -
      context.startedAt
    ).toFixed(2) +
    " ms"
  );

  return lines.join("\n");

}

/* ===============================
   Build Dev Console Error Text
=============================== */

function buildDevConsoleErrorText(
  context,
  error
) {

  const lines = [];

  if (context.logs.length) {

    lines.push(
      "=== Console ==="
    );

    lines.push(
      context.logs.join("\n")
    );

    lines.push("");

  }

  lines.push(
    "=== Error ==="
  );

  lines.push(
    formatDevConsoleError(
      error
    )
  );

  lines.push("");

  lines.push(
    "Execution: " +
    (
      performance.now() -
      context.startedAt
    ).toFixed(2) +
    " ms"
  );

  return lines.join("\n");

}

/* ===============================
   Execute Dev Console Sync
=============================== */

function executeDevConsoleSync(
  context,
  result
) {

  handleDevConsoleSuccess(
    context,
    result
  );

}

/* ===============================
   Execute Dev Console Async
=============================== */

function executeDevConsoleAsync(
  context,
  promise
) {

  promise

    .then(result => {

      handleDevConsoleSuccess(
        context,
        result
      );

    })

    .catch(error => {

      handleDevConsoleError(
        context,
        error
      );

    });

}

/* ===============================
   Complete Dev Console Execution
=============================== */

function completeDevConsoleExecution(
  context,
  text
) {

  finishDevConsoleExecution(
    context
  );

  devConsoleResult =
    text;

  if (
    context.resultBox
  ) {

    context.resultBox.value =
      text;

  }

}

/* ===============================
   Hook Dev Console Execution
=============================== */

function hookDevConsoleExecution(
  context
) {

  function capture(
    type,
    args
  ) {

    context.logs.push(
      "[" + type + "] " +
      args
        .map(formatDevConsoleValue)
        .join(" ")
    );

  }

  console.log =
    function(...args) {

      capture(
        "log",
        args
      );

      context.originalConsole.log.apply(
        console,
        args
      );

    };

  console.warn =
    function(...args) {

      capture(
        "warn",
        args
      );

      context.originalConsole.warn.apply(
        console,
        args
      );

    };

  console.error =
    function(...args) {

      capture(
        "error",
        args
      );

      context.originalConsole.error.apply(
        console,
        args
      );

    };

}

/* ===============================
   Handle Dev Console Success
=============================== */

function handleDevConsoleSuccess(
  context,
  result
) {

  try {

    const text =
      buildDevConsoleSuccessText(
        context,
        result
      );

    completeDevConsoleExecution(
      context,
      text
    );

  } catch (error) {

    handleDevConsoleError(
      context,
      error
    );

  }

}

/* ===============================
   Handle Dev Console Error
=============================== */

function handleDevConsoleError(
  context,
  error
) {

  let text = "";

  try {

    text =
      buildDevConsoleErrorText(
        context,
        error
      );

  } catch (formatError) {

    text = [
      "=== Error ===",
      String(
        error &&
        error.message
          ? error.message
          : error
      ),
      "",
      "=== Format Error ===",
      String(
        formatError &&
        formatError.message
          ? formatError.message
          : formatError
      )
    ].join("\n");

  }

  completeDevConsoleExecution(
    context,
    text
  );

}

function formatDevConsoleValue(
  value
) {

  if (value === undefined) {
    return "undefined";
  }

  if (value === null) {
    return "null";
  }

  if (
    value instanceof Error
  ) {
    return formatDevConsoleError(
      value
    );
  }

  if (
    typeof value === "string"
  ) {
    return value;
  }

  if (
    typeof value === "function"
  ) {

    return (
      "[Function " +
      (
        value.name ||
        "anonymous"
      ) +
      "]"
    );

  }

  if (
    typeof value === "object"
  ) {

    try {

      return JSON.stringify(
        value,
        createDevConsoleJsonReplacer(),
        2
      );

    } catch (error) {

      return String(value);

    }

  }

  return String(value);

}

/* ===============================
   Dev Console JSON Replacer
=============================== */

function createDevConsoleJsonReplacer() {

  const visited =
    new WeakSet();

  return function(
    key,
    value
  ) {

    if (
      typeof value === "bigint"
    ) {
      return value.toString() + "n";
    }

    if (
      typeof value === "function"
    ) {
      return (
        "[Function " +
        (value.name || "anonymous") +
        "]"
      );
    }

    if (
      typeof value === "undefined"
    ) {
      return "[undefined]";
    }

    if (
      typeof value === "symbol"
    ) {
      return value.toString();
    }

    if (
      value instanceof Error
    ) {
      return {
        name:
          value.name,
        message:
          value.message,
        stack:
          value.stack || ""
      };
    }

    if (
      value &&
      typeof value === "object"
    ) {

      if (
        visited.has(value)
      ) {
        return "[Circular]";
      }

      visited.add(value);

    }

    return value;

  };

}

/* ===============================
   Format Dev Console Error
=============================== */

function formatDevConsoleError(
  error
) {

  if (!error) {
    return "Unknown Error";
  }

  if (
    typeof error === "string"
  ) {
    return error;
  }

  const name =
    error.name ||
    "Error";

  const message =
    error.message ||
    String(error);

  const lines = [
    name + ": " + message
  ];

  if (error.stack) {

    const stack =
      String(error.stack);

    if (
      !stack.startsWith(
        name + ": " + message
      )
    ) {
      lines.push("");
      lines.push(stack);
    } else {

      const stackLines =
        stack.split(/\r?\n/);

      if (stackLines.length > 1) {
        lines.push("");
        lines.push(
          stackLines
            .slice(1)
            .join("\n")
        );
      }

    }

  }

  return lines.join("\n");

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

/* ===============================
   Set Dev Console Input
=============================== */

function setDevConsoleInput(
  code,
  options = {}
) {

  const source =
    String(code || "");

  const input =
    get("devConsoleInput");

  localStorage.setItem(
    "devConsoleLastInput",
    source
  );

  if (!input) {

    if (
      options.reopen === true &&
      typeof showMobileConsole ===
      "function"
    ) {
      showMobileConsole();
    }

    return false;
  }

  input.value =
    source;

  input.focus();

  const position =
    source.length;

  input.selectionStart =
    position;

  input.selectionEnd =
    position;

  if (
    typeof updateDevConsoleSuggestions ===
    "function"
  ) {
    updateDevConsoleSuggestions();
  }

  return true;

}

/* ===============================
   Load And Execute Console Code
=============================== */

function runDevConsoleCode(
  code
) {

  const source =
    String(code || "")
      .trim();

  if (!source) {
    return false;
  }

  const loaded =
    setDevConsoleInput(
      source
    );

  if (!loaded) {
    return false;
  }

  executeDevConsole();

  return true;

}

/* ===============================
   Execute Dev Console Source
=============================== */

function executeDevConsoleSource(
  code
) {

  const source =
    String(code || "")
      .trim();

  if (!source) {
    return undefined;
  }

  try {

    return Function(
      `"use strict";
return (
${source}
);`
    )();

  } catch (expressionError) {

    if (
      expressionError instanceof
      SyntaxError
    ) {

      return Function(
        `"use strict";
${source}
`
      )();

    }

    throw expressionError;

  }

}