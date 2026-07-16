/* ===============================
   FILE: 11_quick_command.js
   Quick Command
   IDE-060
=============================== */

const QUICK_COMMAND_STORAGE_KEY =
  "devConsoleQuickButtons";

const QUICK_COMMAND_HISTORY_KEY =
  "ideQuickCommandHistory";

const QUICK_COMMAND_HISTORY_LIMIT =
  20;

let devConsoleQuickButtons =
  loadJson(
    QUICK_COMMAND_STORAGE_KEY,
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

let ideQuickCommandHistory =
  loadJson(
    QUICK_COMMAND_HISTORY_KEY,
    []
  );

/* ===============================
   Normalize Quick Command
=============================== */

function normalizeQuickCommand(
  command,
  index = 0
) {

  if (
    !command ||
    typeof command !== "object"
  ) {
    return null;
  }

  const label =
    String(
      command.label || ""
    ).trim();

  const code =
    String(
      command.code || ""
    ).trim();

  if (
    !label ||
    !code
  ) {
    return null;
  }

  return {
    id:
      String(
        command.id ||
        `QUICK-${index + 1}`
      ).trim(),
    label,
    code,
    enabled:
      command.enabled !== false
  };

}

/* ===============================
   Validate Quick Command
=============================== */

function validateQuickCommandRecord(
  command,
  index = 0
) {

  const normalized =
    normalizeQuickCommand(
      command,
      index
    );

  const errors = [];

  if (!normalized) {
    errors.push(
      "label or code is missing"
    );
  }

  if (
    normalized &&
    normalized.enabled !== true
  ) {
    errors.push(
      "command is disabled"
    );
  }

  return {
    valid:
      errors.length === 0,
    errors,
    command:
      normalized
  };

}

/* ===============================
   Get Quick Commands
=============================== */

function getQuickCommands() {

  return devConsoleQuickButtons
    .map((command, index) =>
      normalizeQuickCommand(
        command,
        index
      )
    )
    .filter(Boolean)
    .map(command => ({
      ...command
    }));

}

/* ===============================
   Save Quick Commands
=============================== */

function saveDevConsoleQuickButtons() {

  const normalized =
    getQuickCommands();

  devConsoleQuickButtons =
    normalized;

  localStorage.setItem(
    QUICK_COMMAND_STORAGE_KEY,
    JSON.stringify(
      normalized
    )
  );

  registerQuickCommandsToCommandPalette();

  return true;

}

/* ===============================
   Build Quick Commands
=============================== */

function buildDevConsoleQuickCommands() {

  const buttons =
    getQuickCommands()
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

/* ===============================
   Execute Quick Command
=============================== */

function runDevConsoleQuickCommand(
  index
) {

  const item =
    devConsoleQuickButtons[index];

  const validation =
    validateQuickCommandRecord(
      item,
      index
    );

  if (!validation.valid) {
    return false;
  }

  const command =
    validation.command;

  const startedAt =
    Date.now();

  try {

    const result =
      runDevConsoleCode(
        command.code
      );

    addQuickCommandHistory({
      command,
      success: true,
      startedAt,
      resultType:
        result &&
        typeof result.then ===
        "function"
          ? "promise"
          : typeof result
    });

    return result;

  } catch (error) {

    addQuickCommandHistory({
      command,
      success: false,
      startedAt,
      error:
        error &&
        error.message
          ? error.message
          : String(error || "")
    });

    throw error;

  }

}

/* ===============================
   Quick Command History
=============================== */

function addQuickCommandHistory(
  entry
) {

  if (
    !entry ||
    !entry.command
  ) {
    return false;
  }

  const record = {
    id:
      `QH-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,
    commandId:
      entry.command.id || "",
    label:
      entry.command.label || "",
    code:
      entry.command.code || "",
    success:
      entry.success !== false,
    error:
      entry.error || "",
    resultType:
      entry.resultType || "",
    executedAt:
      entry.startedAt ||
      Date.now()
  };

  ideQuickCommandHistory.unshift(
    record
  );

  ideQuickCommandHistory =
    ideQuickCommandHistory.slice(
      0,
      QUICK_COMMAND_HISTORY_LIMIT
    );

  localStorage.setItem(
    QUICK_COMMAND_HISTORY_KEY,
    JSON.stringify(
      ideQuickCommandHistory
    )
  );

  return record;

}

function getQuickCommandHistory(
  limit = QUICK_COMMAND_HISTORY_LIMIT
) {

  return ideQuickCommandHistory
    .slice(
      0,
      Math.max(
        0,
        Number(limit) || 0
      )
    )
    .map(record => ({
      ...record
    }));

}

function clearQuickCommandHistory() {

  ideQuickCommandHistory = [];

  localStorage.removeItem(
    QUICK_COMMAND_HISTORY_KEY
  );

  return true;

}

function buildQuickCommandHistoryHtml() {

  const history =
    getQuickCommandHistory(10);

  if (!history.length) {
    return `
<div class="function-item">
  実行履歴はありません。
</div>
`;
  }

  return history
    .map(record => `
<div class="function-item">
  <b>${escapeHtml(record.label || "Command")}</b>
  ${record.success ? "✅" : "❌"}<br>
  <code>${escapeHtml(record.code || "")}</code><br>
  <small>${escapeHtml(
    new Date(
      record.executedAt
    ).toLocaleString()
  )}</small>
</div>
`)
    .join("");

}

/* ===============================
   Quick Command Editor
=============================== */

function showDevConsoleQuickEditor() {

  openFloatPanel(
    "Quick Command Editor",
    `
<button onclick="addDevConsoleQuick()">
  ＋追加
</button>

<button onclick="showQuickCommandHistory()">
  🕘 Recent
</button>

${getQuickCommands().map((item, index) => `
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

function showQuickCommandHistory() {

  openFloatPanel(
    "Recent Quick Commands",
    `
<button onclick="clearQuickCommandHistory(); showQuickCommandHistory();">
  履歴を削除
</button>

${buildQuickCommandHistoryHtml()}
`
  );

}

function addDevConsoleQuick() {

  const label =
    prompt("ラベル", "New");

  if (!label) {
    return false;
  }

  const code =
    prompt("コード", "");

  if (!code) {
    return false;
  }

  const validation =
    validateQuickCommandRecord({
      label,
      code
    }, devConsoleQuickButtons.length);

  if (!validation.valid) {
    return false;
  }

  devConsoleQuickButtons.push(
    validation.command
  );

  saveDevConsoleQuickButtons();
  showDevConsoleQuickEditor();

  return true;

}

function editDevConsoleQuick(index) {

  const item =
    devConsoleQuickButtons[index];

  if (!item) {
    return false;
  }

  const label =
    prompt(
      "ラベル",
      item.label || ""
    );

  if (!label) {
    return false;
  }

  const code =
    prompt(
      "コード",
      item.code || ""
    );

  if (!code) {
    return false;
  }

  const validation =
    validateQuickCommandRecord({
      ...item,
      label,
      code
    }, index);

  if (!validation.valid) {
    return false;
  }

  devConsoleQuickButtons[index] =
    validation.command;

  saveDevConsoleQuickButtons();
  showDevConsoleQuickEditor();

  return true;

}

function deleteDevConsoleQuick(index) {

  if (!confirm("削除しますか？")) {
    return false;
  }

  if (!devConsoleQuickButtons[index]) {
    return false;
  }

  devConsoleQuickButtons.splice(
    index,
    1
  );

  saveDevConsoleQuickButtons();
  showDevConsoleQuickEditor();

  return true;

}

function moveDevConsoleQuickUp(index) {

  if (index <= 0) {
    return false;
  }

  const temp =
    devConsoleQuickButtons[
      index - 1
    ];

  devConsoleQuickButtons[
    index - 1
  ] = devConsoleQuickButtons[index];

  devConsoleQuickButtons[index] =
    temp;

  saveDevConsoleQuickButtons();
  showDevConsoleQuickEditor();

  return true;

}

function moveDevConsoleQuickDown(index) {

  if (
    index < 0 ||
    index >=
    devConsoleQuickButtons.length - 1
  ) {
    return false;
  }

  const temp =
    devConsoleQuickButtons[
      index + 1
    ];

  devConsoleQuickButtons[
    index + 1
  ] = devConsoleQuickButtons[index];

  devConsoleQuickButtons[index] =
    temp;

  saveDevConsoleQuickButtons();
  showDevConsoleQuickEditor();

  return true;

}

/* ===============================
   Load Quick Command
=============================== */

function loadDevConsoleQuickCommand(
  index
) {

  const item =
    devConsoleQuickButtons[index];

  const validation =
    validateQuickCommandRecord(
      item,
      index
    );

  if (!validation.valid) {
    return false;
  }

  return setDevConsoleInput(
    validation.command.code
  );

}

/* ===============================
   Command Palette Integration
=============================== */

function registerQuickCommandsToCommandPalette() {

  if (
    typeof registerCommandPaletteCommand !==
    "function"
  ) {
    return false;
  }

  registerCommandPaletteCommand({
    id:
      "ide.quickCommand.open",
    type:
      "command",
    title:
      "Open Quick Command Editor",
    summary:
      "Quick Command Editorを開きます。",
    category:
      "IDE",
    keywords: [
      "quick",
      "command",
      "shortcut",
      "favorite"
    ],
    icon:
      "⚡",
    action() {
      return showDevConsoleQuickEditor();
    }
  });

  return true;

}

/* ===============================
   Status API
=============================== */

function getQuickCommandStatus() {

  const validation =
    validateQuickCommand();

  return {
    id:
      "IDE-060",
    title:
      "Quick Command",
    version:
      "1.0",
    status:
      validation.valid
        ? "Ready"
        : "Error",
    ready:
      validation.valid,
    progress:
      validation.valid
        ? 100
        : Math.round(
            validation.passed /
            validation.total *
            100
          ),
    health:
      validation.valid
        ? 100
        : Math.round(
            validation.passed /
            validation.total *
            100
          ),
    commands:
      getQuickCommands().length,
    history:
      ideQuickCommandHistory.length,
    nextTask:
      validation.valid
        ? "IDE-070 Autocomplete"
        : "Fix Quick Command validation",
    updatedAt:
      Date.now()
  };

}

/* ===============================
   Validate IDE-060
=============================== */

function validateQuickCommand() {

  const commands =
    getQuickCommands();

  const invalidRecords =
    devConsoleQuickButtons
      .map((command, index) => ({
        index,
        validation:
          validateQuickCommandRecord(
            command,
            index
          )
      }))
      .filter(item =>
        !item.validation.valid
      )
      .map(item => ({
        index:
          item.index,
        errors:
          item.validation.errors
      }));

  const checks = {
    storage:
      Array.isArray(
        devConsoleQuickButtons
      ),
    records:
      invalidRecords.length === 0,
    renderer:
      typeof buildDevConsoleQuickCommands ===
      "function",
    editor:
      typeof showDevConsoleQuickEditor ===
      "function",
    validator:
      typeof validateQuickCommandRecord ===
      "function",
    executor:
      typeof runDevConsoleQuickCommand ===
      "function" &&
      typeof runDevConsoleCode ===
      "function",
    history:
      Array.isArray(
        ideQuickCommandHistory
      ) &&
      typeof addQuickCommandHistory ===
      "function",
    commandPalette:
      typeof registerQuickCommandsToCommandPalette ===
      "function"
  };

  const failed =
    Object.entries(checks)
      .filter(entry =>
        entry[1] !== true
      )
      .map(entry =>
        entry[0]
      );

  return {
    id:
      "IDE-060",
    title:
      "Quick Command",
    valid:
      failed.length === 0,
    passed:
      Object.keys(checks).length -
      failed.length,
    total:
      Object.keys(checks).length,
    failed,
    checks,
    commands:
      commands.length,
    history:
      ideQuickCommandHistory.length,
    invalidRecords
  };

}

/* ===============================
   Initialize
=============================== */

function initQuickCommand() {

  devConsoleQuickButtons =
    getQuickCommands();

  ideQuickCommandHistory =
    Array.isArray(
      ideQuickCommandHistory
    )
      ? ideQuickCommandHistory
      : [];

  registerQuickCommandsToCommandPalette();

  return true;

}

/* ===============================
   Window Export
=============================== */

window.initQuickCommand =
  initQuickCommand;
window.getQuickCommands =
  getQuickCommands;
window.validateQuickCommandRecord =
  validateQuickCommandRecord;
window.buildDevConsoleQuickCommands =
  buildDevConsoleQuickCommands;
window.runDevConsoleQuickCommand =
  runDevConsoleQuickCommand;
window.showDevConsoleQuickEditor =
  showDevConsoleQuickEditor;
window.showQuickCommandHistory =
  showQuickCommandHistory;
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
window.addQuickCommandHistory =
  addQuickCommandHistory;
window.getQuickCommandHistory =
  getQuickCommandHistory;
window.clearQuickCommandHistory =
  clearQuickCommandHistory;
window.registerQuickCommandsToCommandPalette =
  registerQuickCommandsToCommandPalette;
window.getQuickCommandStatus =
  getQuickCommandStatus;
window.validateQuickCommand =
  validateQuickCommand;

initQuickCommand();

console.log(
  "11_quick_command loaded"
);
