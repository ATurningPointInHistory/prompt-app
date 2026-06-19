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
    alert("記録なし");
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

  macroList[name] = {
    name,
    label: name,
    icon: "▶",
    favorite: true,
    order: Object.keys(macroList).length,
    category: "",
    actions: [...currentMacroActions]
  };

  localStorage.setItem(
    "macroList",
    JSON.stringify(macroList)
  );

  if (
    typeof refreshRepairQuickMacroButtons ===
    "function"
  ) {
    refreshRepairQuickMacroButtons();
  }

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

  if (
    typeof refreshRepairQuickMacroButtons ===
    "function"
  ) {
    refreshRepairQuickMacroButtons();
  }

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
  names.map(name => {

    const item =
      typeof normalizeMacroItem === "function"
        ? normalizeMacroItem(name)
        : {
            name,
            label: name,
            icon: "▶",
            favorite: true
          };

    return `
<div class="macro-row">

<button
  class="macro-mini-btn"
  onclick='runMacro(${JSON.stringify(name)})'>
  ▶
</button>

<button
  class="macro-mini-btn"
  onclick='showMacroStepEditor(${JSON.stringify(name)})'>
  ✏
</button>

<button
  class="macro-mini-btn"
  onclick='toggleMacroFavorite(${JSON.stringify(name)})'>
  ${item.favorite ? "⭐" : "☆"}
</button>

<button
  class="macro-mini-btn"
  onclick='editMacroIcon(${JSON.stringify(name)})'>
  ${escapeHtml(item.icon)}
</button>

<button
  class="macro-mini-btn"
  onclick='deleteMacro(${JSON.stringify(name)})'>
  🗑
</button>

<span class="macro-name">
  ${escapeHtml(item.label || name)}
</span>

</div>
`;

  }).join("")
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

function showMacroStepEditor(name) {

  const macro =
    macroList[name];

  const actions =
    Array.isArray(macro)
      ? macro
      : macro && Array.isArray(macro.actions)
        ? macro.actions
        : null;

  if (!actions) {
    alert("Macroなし");
    return;
  }

  openFloatPanel(
    `Macro Step : ${name}`,
    actions.map(
      (step, index) => `

<div class="macro-step-row">

<b>
#${index + 1}
</b>

<br>

${escapeHtml(
  step.type || ""
)}

<br>

${escapeHtml(
  step.action ||
  step.label ||
  step.code ||
  ""
)}

<br><br>

<button
onclick="
moveMacroStepUp(
'${name}',
${index}
)">
⬆
</button>

<button
onclick="
moveMacroStepDown(
'${name}',
${index}
)">
⬇
</button>

<button
onclick="
deleteMacroStep(
'${name}',
${index}
)">
🗑
</button>

<button
onclick="
addMacroDelayStep(
'${name}',
${index}
)">
⏱
</button>

</div>

`
    ).join("")
  );

}

function deleteMacroStep(
  name,
  index
) {

  const actions =
    macroList[name];

  if (!actions) {
    return;
  }

  actions.splice(
    index,
    1
  );

  localStorage.setItem(
    "macroList",
    JSON.stringify(
      macroList
    )
  );

  showMacroStepEditor(
    name
  );

}

function moveMacroStepUp(
  name,
  index
) {

  if (index <= 0) {
    return;
  }

  const actions =
    macroList[name];

  [
    actions[index - 1],
    actions[index]
  ] = [
    actions[index],
    actions[index - 1]
  ];

  localStorage.setItem(
    "macroList",
    JSON.stringify(
      macroList
    )
  );

  showMacroStepEditor(
    name
  );

}

function moveMacroStepDown(
  name,
  index
) {

  const actions =
    macroList[name];

  if (
    index >=
    actions.length - 1
  ) {
    return;
  }

  [
    actions[index],
    actions[index + 1]
  ] = [
    actions[index + 1],
    actions[index]
  ];

  localStorage.setItem(
    "macroList",
    JSON.stringify(
      macroList
    )
  );

  showMacroStepEditor(
    name
  );

}

function addMacroDelayStep(name, index) {

  const actions =
    macroList[name];

  if (!actions) {
    return;
  }

  const msText =
    prompt(
      "停止時間 ms",
      "1000"
    );

  if (msText === null) {
    return;
  }

  const ms =
    Number(msText);

  if (!Number.isFinite(ms) || ms < 0) {
    alert("数値で入力してください");
    return;
  }

  actions.splice(
    index + 1,
    0,
    {
      type: "delay",
      ms
    }
  );

  localStorage.setItem(
    "macroList",
    JSON.stringify(macroList)
  );

  showMacroStepEditor(name);

}

async function runMacro(name) {

  const macro =
    macroList[name];

  const actions =
    Array.isArray(macro)
      ? macro
      : macro && Array.isArray(macro.actions)
        ? macro.actions
        : null;

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

      if (step.type === "input") {

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

      if (step.type === "delay") {

        const ms =
          Number(step.ms || 0);

        if (ms > 0) {
          await new Promise(resolve =>
            setTimeout(resolve, ms)
          );
        }

        continue;
      }

      if (step.type === "function") {

        const fn =
          window[step.name];

        if (typeof fn !== "function") {

          alert(
            "関数なし: " +
            step.name
          );

          continue;

        }

        fn();

        continue;

      }

      if (step.type === "action") {

        const data =
          step.data || {};

        if (step.action === "searchRepairText") {

          const box =
            get("repairSearch");

          if (box) {
            box.value =
              window.macroInputValue ||
              data.keyword ||
              "";
          }

          if (typeof searchRepairText === "function") {
            searchRepairText();
          }

          continue;
        }

        if (step.action === "searchAllRepairFiles") {

          const box =
            get("repairSearch");

          if (box) {
            box.value =
              window.macroInputValue ||
              data.keyword ||
              "";
          }

          if (typeof searchAllRepairFiles === "function") {
            searchAllRepairFiles();
          }

          continue;
        }

        if (step.action === "openGlobalSearchResult") {

          const list =
            Array.isArray(window.repairGlobalSearchResults)
              ? window.repairGlobalSearchResults
              : [];

          const index =
            typeof data.index === "number"
              ? data.index
              : list.findIndex(item =>
                  item.fileName === data.fileName &&
                  item.lineNumber === data.lineNumber
                );

          if (
            index >= 0 &&
            typeof openGlobalSearchResult === "function"
          ) {
            openGlobalSearchResult(index);
          }

          continue;
        }

      }

      if (
        step.type === "onclick" &&
        step.code
      ) {

        new Function(
          step.code
        )();

      }

    } catch (e) {

      console.error(
        "Macro step failed",
        step,
        e
      );

      alert(
        "Macro実行エラー\n\n" +
        (step.action ||
         step.name ||
         step.code ||
         step.type ||
         "") +
        "\n\n" +
        e.message
      );

      break;

    }

  }

  macroRecording =
    wasRecording;

}