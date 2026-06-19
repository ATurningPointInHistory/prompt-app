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

function saveDevConsoleQuickButtons() {

  localStorage.setItem(

    "devConsoleQuickButtons",

    JSON.stringify(
      devConsoleQuickButtons
    )

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