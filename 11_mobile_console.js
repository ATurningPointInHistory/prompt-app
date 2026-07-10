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

function buildDevConsoleToolbarHtml() {

  return `
<div class="float-panel-actions">

  <button onclick="pasteDevConsoleInput()">📋 Paste</button>
  <button onclick="executeDevConsole()">▶ Run</button>
  <button onclick="pasteAndRunDevConsole()">⚡ Paste&Run</button>
  <button onclick="clearDevConsoleInput()">🗑 Clear</button>
  <button onclick="saveDevConsoleFavorite()">⭐ 保存</button>
  <button onclick="showDevConsoleFavorites()">📂 Favorite</button>
  <button onclick="copyDevConsoleResult()">📋 結果</button>
  <button onclick="showDevConsoleHistory()">🕘 履歴</button>
  <button onclick="clearMobileConsole()">🧹 ログ</button>

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

  localStorage.setItem(
    "devConsoleLastInput",
    code
  );

  if (
    typeof saveDevConsoleHistory ===
    "function"
  ) {
    saveDevConsoleHistory(code);
  }

  const logs = [];

  const originalLog =
    console.log;

  const originalWarn =
    console.warn;

  const originalError =
    console.error;

  const startedAt =
    performance.now();

  function capture(
    type,
    args
  ) {

    logs.push(
      "[" + type + "] " +
      args
        .map(formatDevConsoleValue)
        .join(" ")
    );

  }

  function restoreConsole() {

    console.log =
      originalLog;

    console.warn =
      originalWarn;

    console.error =
      originalError;

  }

  function updateResultBox() {

    if (resultBox) {
      resultBox.value =
        devConsoleResult;
    }

  }

  function buildSuccessOutput(
    result
  ) {

    const elapsed =
      performance.now() -
      startedAt;

    const output = [];

    if (logs.length) {

      output.push(
        "=== Console ==="
      );

      output.push(
        logs.join("\n")
      );

    }

    const hasResult =
      result !== undefined;

    if (
      hasResult ||
      !logs.length
    ) {

      if (output.length) {
        output.push("");
      }

      output.push(
        "=== Result ==="
      );

      output.push(
        formatDevConsoleValue(result)
      );

    }

    output.push("");
    output.push(
      "Execution: " +
      elapsed.toFixed(2) +
      " ms"
    );

    devConsoleResult =
      output.join("\n");

    updateResultBox();

  }

  function buildErrorOutput(
    error
  ) {

    const elapsed =
      performance.now() -
      startedAt;

    const output = [];

    if (logs.length) {

      output.push(
        "=== Console ==="
      );

      output.push(
        logs.join("\n")
      );

      output.push("");

    }

    output.push(
      "=== Error ==="
    );

    output.push(
      formatDevConsoleError(error)
    );

    output.push("");
    output.push(
      "Execution: " +
      elapsed.toFixed(2) +
      " ms"
    );

    devConsoleResult =
      output.join("\n");

    updateResultBox();

  }

  try {

    console.log =
      function(...args) {

        capture(
          "log",
          args
        );

        originalLog.apply(
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

        originalWarn.apply(
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

        originalError.apply(
          console,
          args
        );

      };

    const result =
      executeDevConsoleCode(
        code
      );

    if (
      result &&
      typeof result.then ===
      "function"
    ) {

      result
        .then(value => {

          restoreConsole();

          buildSuccessOutput(
            value
          );

        })
        .catch(error => {

          restoreConsole();

          buildErrorOutput(
            error
          );

        });

      return;

    }

    restoreConsole();

    buildSuccessOutput(
      result
    );

  } catch (error) {

    restoreConsole();

    buildErrorOutput(
      error
    );

  }

}

/* ===============================
   Execute Dev Console Code
=============================== */

function executeDevConsoleCode(
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

    return Function(
      `"use strict";
${source}
`
    )();

  }

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
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }

  if (
    typeof value === "symbol"
  ) {
    return value.toString();
  }

  if (
    typeof value === "function"
  ) {

    return [
      "[Function]",
      value.name
        ? "Name: " + value.name
        : "Anonymous",
      "",
      String(value)
    ].join("\n");

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

      try {
        return String(value);
      } catch (stringError) {
        return "[Unserializable Object]";
      }

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