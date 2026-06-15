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

function deleteMacro(name) {

  if (!name) {
    return;
  }

  if (
    !confirm(
      "このMacroを削除しますか？\n\n" +
      name
    )
  ) {
    return;
  }

  delete macroList[name];

  localStorage.setItem(
    "macroList",
    JSON.stringify(macroList)
  );

  updateRepairStatus(
    "Macro削除: " + name
  );

  showMacroList();

}

function recordMacroClick(
  event
) {

  if (
    !macroRecording
  ) {
    return;
  }

  const btn =
    event.target.closest(
      "button"
    );

  if (!btn) {
    return;
  }

  const onclick =
    btn.getAttribute(
      "onclick"
    );

  if (!onclick) {
    return;
  }

  if (
    onclick.includes(
      "startMacroRecording"
    ) ||
    onclick.includes(
      "stopMacroRecording"
    ) ||
    onclick.includes(
      "showMacroList"
    ) ||
    onclick.includes(
      "runMacro"
    )
  ) {
    return;
  }

  currentMacroActions.push({

    label:
      btn.innerText,

    code:
      onclick

  });

}

const keyword =
  get("repairSearch")
    ?.value
    .trim();

if (
  typeof recordMacroAction ===
  "function"
) {
  recordMacroAction(
    "searchRepairText",
    {
      keyword
    }
  );
}

function showMacroList() {

  const names =
    Object.keys(macroList);

  if (!names.length) {
    alert("Macroなし");
    return;
  }

  openFloatPanel(
    "Macro",
    `
<div class="macro-list">
${
  names.map(name => `
<div class="macro-row">

  <button
    class="macro-mini-btn"
    onclick='runMacro(${JSON.stringify(name)})'>
    ▶
  </button>

  <button
    class="macro-mini-btn"
    onclick='deleteMacro(${JSON.stringify(name)})'>
    🗑
  </button>

  <span class="macro-name">
    ${escapeHtml(name)}
  </span>

</div>
`).join("")
}
</div>
`
  );

}