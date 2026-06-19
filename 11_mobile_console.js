/* ===============================
   FILE: 11_mobile_console.js
   Mobile Debug Console
=============================== */

let mobileConsoleLogs = [];

let mobileConsoleInitialized = false;

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
    "Mobile Console",
    `
<div class="float-panel-actions">
  <button onclick="copyMobileConsole()">コピー</button>
  <button onclick="clearMobileConsole()">クリア</button>
  <button onclick="checkFunctionExistsPrompt()">関数確認</button>
  <button onclick="runMobileConsoleEval()">JS実行</button>
  <button onclick="showMobileConsoleHistory()">履歴</button>
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

  const defaultCode =
    mobileConsoleHistory[0] ||
    "typeof startMacroRecording";

  const code =
    prompt(
      "実行するJS",
      defaultCode
    );

  if (!code) {
    return;
  }

  saveMobileConsoleHistory(code);

  try {

    const result =
      Function(
        "return (" + code + ")"
      )();

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