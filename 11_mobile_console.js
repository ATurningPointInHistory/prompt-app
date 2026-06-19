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
<textarea
  id="devConsoleInput"
  rows="8"
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
>${escapeHtml(devConsoleResult || "")}</textarea>

<div class="small" style="margin-top:8px;">
Console Log
</div>

<pre class="code-preview">
${escapeHtml(
  mobileConsoleLogs.map(log =>
    `[${log.time}] ${log.type}\n${log.text}`
  ).join("\n\n") || "ログなし"
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