/* ===============================
   FILE: 11_mobile_console_quick.js
   Dev Console Quick Command
=============================== */

let devConsoleQuickButtons =
  loadJson(
    "devConsoleQuickButtons",
    [
      {
        label: "DB",
        code: "Object.keys(projectFunctionDatabase || {}).length"
      },
      {
        label: "Refresh",
        code: "refreshCurrentProjectFunctionDatabase()"
      },
      {
        label: "Health",
        code: "showHtmlHealth()"
      },
      {
        label: "Jump",
        code: "jumpToFunction(\"searchRepairText\")"
      }
    ]
  );

function saveDevConsoleQuickButtons() {

  localStorage.setItem(
    "devConsoleQuickButtons",
    JSON.stringify(
      devConsoleQuickButtons
    )
  );

}

function buildDevConsoleQuickCommands() {

  const buttons =
    devConsoleQuickButtons
      .map((item, index) => `
<button
  onclick="loadDevConsoleQuickCommand(${index})"
  oncontextmenu="
    runDevConsoleQuickCommand(${index});
    return false;
  ">
  ${escapeHtml(item.label || "Cmd")}
</button>
`)
      .join("");

  return `
${buttons}

<button onclick="showDevConsoleQuickEditor()">
  ⚙ Edit
</button>
`;

}

function runDevConsoleQuickCommand(
  index
) {

  const item =
    devConsoleQuickButtons[index];

  if (!item) {
    return false;
  }

  return runDevConsoleCode(
    item.code || ""
  );

}

function showDevConsoleQuickEditor() {

  openFloatPanel(
    "Quick Command Editor",
    `
<button onclick="addDevConsoleQuick()">
  ＋追加
</button>

${devConsoleQuickButtons.map((item, index) => `
<div class="function-item">
  <b>${escapeHtml(item.label || "Cmd")}</b><br>
  <code>${escapeHtml(item.code || "")}</code><br>

  <button onclick="editDevConsoleQuick(${index})">✏</button>
  <button onclick="moveDevConsoleQuickUp(${index})">⬆</button>
  <button onclick="moveDevConsoleQuickDown(${index})">⬇</button>
  <button onclick="deleteDevConsoleQuick(${index})">🗑</button>
</div>
`).join("")}
`
  );

}

function addDevConsoleQuick() {

  const label =
    prompt("ラベル", "New");

  if (!label) {
    return;
  }

  const code =
    prompt("コード", "");

  if (!code) {
    return;
  }

  devConsoleQuickButtons.push({
    label,
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

  const label =
    prompt("ラベル", item.label || "");

  if (!label) {
    return;
  }

  const code =
    prompt("コード", item.code || "");

  if (!code) {
    return;
  }

  item.label = label;
  item.code = code;

  saveDevConsoleQuickButtons();
  showDevConsoleQuickEditor();

}

function deleteDevConsoleQuick(index) {

  if (!confirm("削除しますか？")) {
    return;
  }

  devConsoleQuickButtons.splice(index, 1);

  saveDevConsoleQuickButtons();
  showDevConsoleQuickEditor();

}

function moveDevConsoleQuickUp(index) {

  if (index <= 0) {
    return;
  }

  const temp =
    devConsoleQuickButtons[index - 1];

  devConsoleQuickButtons[index - 1] =
    devConsoleQuickButtons[index];

  devConsoleQuickButtons[index] =
    temp;

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

  const temp =
    devConsoleQuickButtons[index + 1];

  devConsoleQuickButtons[index + 1] =
    devConsoleQuickButtons[index];

  devConsoleQuickButtons[index] =
    temp;

  saveDevConsoleQuickButtons();
  showDevConsoleQuickEditor();

}

/* ===============================
   Load Quick Command
=============================== */

function loadDevConsoleQuickCommand(
  index
) {

  const item =
    devConsoleQuickButtons[index];

  if (!item) {
    return false;
  }

  return setDevConsoleInput(
    item.code || ""
  );

}

window.buildDevConsoleQuickCommands =
  buildDevConsoleQuickCommands;

window.runDevConsoleQuickCommand =
  runDevConsoleQuickCommand;

window.showDevConsoleQuickEditor =
  showDevConsoleQuickEditor;

window.addDevConsoleQuick =
  addDevConsoleQuick;

window.editDevConsoleQuick =
  editDevConsoleQuick;

window.deleteDevConsoleQuick =
  deleteDevConsoleQuick;

window.moveDevConsoleQuickUp =
  moveDevConsoleQuickUp;

window.moveDevConsoleQuickDown =
  moveDevConsoleQuickDown;

window.saveDevConsoleQuickButtons =
  saveDevConsoleQuickButtons;

window.loadDevConsoleQuickCommand =
  loadDevConsoleQuickCommand;