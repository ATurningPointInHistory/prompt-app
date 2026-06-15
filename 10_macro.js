/* ===============================
   FILE: 10_macro.js
   Macro Recorder
=============================== */

function startMacroRecording() {

  macroRecording = true;

  currentMacroActions = [];

  updateRepairStatus(
    "Macro記録開始"
  );

}

function stopMacroRecording() {

  macroRecording = false;

  if (
    !currentMacroActions.length
  ) {

    alert(
      "記録なし"
    );

    return;

  }

  const name =
    prompt(
      "Macro名",
      "Macro"
    );

  if (!name) {
    return;
  }

  macroList[name] =
    [...currentMacroActions];

  localStorage.setItem(
    "macroList",
    JSON.stringify(
      macroList
    )
  );

  updateRepairStatus(
    "Macro保存"
  );

}

function runMacro(name) {

  const actions =
    macroList[name];

  if (!actions) {
    return;
  }

  actions.forEach(
    action => {

      try {

        new Function(
          action.code
        )();

      } catch (e) {

        console.error(
          e
        );

      }

    }
  );

}

function showMacroList() {

  const names =
    Object.keys(
      macroList
    );

  openFloatPanel(
    "Macro",
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