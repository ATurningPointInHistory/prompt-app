/* ===============================
   FILE: 10_macro.js
   Macro Recorder
=============================== */

let macroRecording = false;

let currentMacroActions = [];

function getMacroList() {

  return JSON.parse(
    localStorage.getItem(
      "macroList"
    ) || "{}"
  );

}

function saveMacroList(
  data
) {

  localStorage.setItem(
    "macroList",
    JSON.stringify(data)
  );

}

function startMacroRecording() {

  macroRecording = true;

  currentMacroActions = [];

  updateRepairStatus(
    "Macro記録開始"
  );

}

function stopMacroRecording() {

  if (
    !currentMacroActions.length
  ) {

    macroRecording = false;

    alert(
      "記録なし"
    );

    return;

  }

  const name =
    prompt(
      "Macro名",
      "新規Macro"
    );

  if (!name) {

    macroRecording = false;

    return;

  }

  const macros =
    getMacroList();

  macros[name] =
    [...currentMacroActions];

  saveMacroList(
    macros
  );

  macroRecording = false;

  updateRepairStatus(
    `Macro保存: ${name}`
  );

}

function recordMacroAction(
  action
) {

  if (
    !macroRecording
  ) {
    return;
  }

  currentMacroActions.push(
    action
  );

}

function runMacro(
  name
) {

  const macros =
    getMacroList();

  const actions =
    macros[name];

  if (!actions) {

    alert(
      "Macroなし"
    );

    return;

  }

  actions.forEach(
    action => {

      const fn =
        window[action];

      if (
        typeof fn ===
        "function"
      ) {

        try {

          fn();

        } catch (e) {

          console.error(
            action,
            e
          );

        }

      }

    }
  );

}

function showMacroList() {

  const macros =
    getMacroList();

  const names =
    Object.keys(
      macros
    );

  if (!names.length) {

    alert(
      "Macroなし"
    );

    return;

  }

  openFloatPanel(
    "Macro一覧",
    names.map(
      name => `
<div
class="function-item">

  <button
  onclick="
  runMacro(
  '${name}'
  )">
  ▶
  </button>

  ${escapeHtml(name)}

</div>
`
    ).join("")
  );

}