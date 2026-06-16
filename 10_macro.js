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

function recordMacroAction(
  action,
  data = {}
) {

  if (!macroRecording) {
    return;
  }

  currentMacroActions.push({
    type:
      "action",

    action,

    data
  });

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

async function runMacro(name) {

  const actions =
    macroList[name];

  if (!actions) {
    alert("Macroなし");
    return;
  }

  const wasRecording =
    macroRecording;

  macroRecording = false;

  for (const step of actions) {

    try {

      if (
        step.type === "action"
      ) {

        const data =
          step.data || {};

        if (
          step.action ===
          "searchRepairText"
        ) {

          const box =
            get("repairSearch");

          if (box) {
            box.value =
              data.keyword || "";
          }

          searchRepairText();
          continue;
        }

        if (
          step.action ===
          "searchAllRepairFiles"
        ) {

          const box =
            get("repairSearch");

          if (box) {
            box.value =
              data.keyword || "";
          }

          searchAllRepairFiles();
          continue;
        }

        if (
          step.action ===
          "openGlobalSearchResult"
        ) {

          const index =
            typeof data.index === "number"
              ? data.index
              : repairGlobalSearchResults
                  .findIndex(item =>
                    item.fileName === data.fileName &&
                    item.lineNumber === data.lineNumber
                  );

          if (index >= 0) {
            openGlobalSearchResult(index);
          }

          continue;
        }

      }

      if (
        step.type === "onclick" &&
        step.code
      ) {
        new Function(step.code)();
      }

    } catch (e) {

      console.error(
        "Macro step failed",
        step,
        e
      );

      alert(
        "Macro実行エラー\n\n" +
        (step.action || step.code || "") +
        "\n\n" +
        e.message
      );

      break;
    }

  }

  macroRecording =
    wasRecording;

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