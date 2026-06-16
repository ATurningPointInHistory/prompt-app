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
    type: "onclick",
    label:
      btn.innerText,
    code:
      onclick
  });

}

function addMacroInputStep() {

  if (!macroRecording) {
    alert(
      "先に記録開始してください"
    );
    return;
  }

  const label =
    prompt(
      "入力項目名",
      "検索文字"
    );

  if (!label) {
    return;
  }

  currentMacroActions.push({

    type:
      "input",

    label

  });

  updateRepairStatus(
    `入力待ち追加: ${label}`
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

  <button
    onclick='showMacroDetail(${JSON.stringify(name)})'>
    ✏
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

function showMacroDetail(name) {

  const actions =
    macroList[name];

  if (!actions) {
    alert("Macroなし");
    return;
  }

  openFloatPanel(
    `Macro : ${name}`,
    `
<div class="macro-detail">

<pre
class="code-preview"
style="
max-height:60vh;
overflow:auto;
">
${escapeHtml(
  JSON.stringify(
    actions,
    null,
    2
  )
)}
</pre>

<div
style="
display:flex;
gap:4px;
margin-top:6px;
">

<button
onclick="
runMacro(
'${name}'
)">
▶ 実行
</button>

<button
onclick="
showMacroEditor(
'${name}'
)">
✏ 編集
</button>

</div>

</div>
`
  );

}

function saveMacroDetail(oldName) {

  const name =
    get("macroEditName")
      ?.value
      .trim();

  const json =
    get("macroEditJson")
      ?.value
      .trim();

  if (!name || !json) {
    alert("Macro名または内容が空です");
    return;
  }

  let actions;

  try {
    actions =
      JSON.parse(json);
  } catch (e) {
    alert(
      "JSON形式が正しくありません\n\n" +
      e.message
    );
    return;
  }

  if (!Array.isArray(actions)) {
    alert("Macro内容は配列である必要があります");
    return;
  }

  if (
    oldName !== name &&
    macroList[name]
  ) {
    alert("同名のMacroが既にあります");
    return;
  }

  delete macroList[oldName];

  macroList[name] =
    actions;

  localStorage.setItem(
    "macroList",
    JSON.stringify(macroList)
  );

  updateRepairStatus(
    "Macro保存: " + name
  );

  showMacroList();

}

function showMacroEditor(name) {

  const actions =
    macroList[name];

  if (!actions) {
    alert("Macroなし");
    return;
  }

  openFloatPanel(
    "Macro編集: " + name,
    `
<div class="macro-edit-box">

<input
  id="macroEditName"
  value="${escapeHtml(name)}">

<textarea
  id="macroEditJson"
  rows="14"
  style="width:100%;">${escapeHtml(
    JSON.stringify(
      actions,
      null,
      2
    )
  )}</textarea>

<div
  style="
    display:grid;
    grid-template-columns:repeat(3, 1fr);
    gap:4px;
    margin-top:6px;
  ">

<button onclick='saveMacroDetail(${JSON.stringify(name)})'>
保存
</button>

<button onclick='runMacro(${JSON.stringify(name)})'>
実行
</button>

<button onclick='showMacroList()'>
戻る
</button>

</div>

</div>
`
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

  const previousInputValue =
    window.macroInputValue || "";

  macroRecording = false;

  window.macroInputValue =
    previousInputValue;

  for (const step of actions) {

    try {

      if (
        step.type === "input"
      ) {

        const value =
          prompt(
            step.label || "入力",
            window.macroInputValue || ""
          );

        if (value === null) {
          alert("マクロ中断");
          return;
        }

        window.macroInputValue =
          value;

        continue;
      }

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
              window.macroInputValue ||
              data.keyword ||
              "";
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
              window.macroInputValue ||
              data.keyword ||
              "";
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
          } else {
            console.warn(
              "Macro search result not found",
              data
            );
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
        (step.action || step.code || step.type || "") +
        "\n\n" +
        e.message
      );

      break;
    }

  }

  macroRecording =
    wasRecording;

}
