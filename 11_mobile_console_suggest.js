/* ===============================
   FILE: 11_mobile_console_suggest.js
   Mobile Console Suggest / Quick Command
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
        label: "Jump",
        code: "jumpToFunction(\"searchRepairText\")"
      },
      {
        label: "Health",
        code: "showHtmlHealth()"
      }
    ]
  );

function buildDevConsoleQuickCommands() {

  return devConsoleQuickButtons
    .map((item, index) => {

      const label =
        item.label ||
        item.title ||
        "Cmd";

      return `
<button onclick="runDevConsoleQuickCommand(${index})">
  ${escapeHtml(label)}
</button>
`;

    })
    .join("");

}

function runDevConsoleQuickCommand(
  index
) {

  const item =
    devConsoleQuickButtons[index];

  if (!item) {
    return;
  }

  const input =
    get("devConsoleInput");

  if (!input) {
    return;
  }

  input.value =
    item.code || "";

  localStorage.setItem(
    "devConsoleLastInput",
    input.value
  );

  input.focus();

  if (
    typeof updateDevConsoleSuggestions ===
    "function"
  ) {
    updateDevConsoleSuggestions();
  }

}

function saveDevConsoleQuickButtons() {

  localStorage.setItem(
    "devConsoleQuickButtons",
    JSON.stringify(
      devConsoleQuickButtons
    )
  );

}

window.buildDevConsoleQuickCommands =
  buildDevConsoleQuickCommands;

window.runDevConsoleQuickCommand =
  runDevConsoleQuickCommand;

window.saveDevConsoleQuickButtons =
  saveDevConsoleQuickButtons;