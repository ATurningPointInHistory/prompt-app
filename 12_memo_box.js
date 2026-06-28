/* ===============================
   12_memo_box.js
=============================== */

/* ===============================
   Memo Box
=============================== */

let memoBoxStatusFilter =
  "";

let memoBoxSearch =
  "";

const MEMO_BOX_STATUSES = [
  "Active",
  "Draft",
  "Todo",
  "Done",
  "Archive"
];

let memoBoxList =
  loadJson(
    "memoBoxList",
    [
      {
        name: "メモ1",
        text: ""
      },
      {
        name: "メモ2",
        text: ""
      }
    ]
  );

let memoBoxActiveIndex = 0;

function selectMemoBox(index) {

  saveMemoBoxCurrent();

  memoBoxActiveIndex =
    index;

  showMemoBox();

}

function saveMemoBoxes() {

  normalizeMemoBoxes();

  localStorage.setItem(
    "memoBoxList",
    JSON.stringify(
      memoBoxList
    )
  );

}

function saveMemoBoxCurrent() {

  normalizeMemoBoxes();

  if (
    memoBoxActiveIndex < 0 ||
    memoBoxActiveIndex >= memoBoxList.length
  ) {
    memoBoxActiveIndex = 0;
  }

  const current =
    memoBoxList[
      memoBoxActiveIndex
    ] || {};

  const name =
    get("memoBoxName")
      ?.value ||
    current.name ||
    "";

  const text =
    get("memoBoxText")
      ?.value ||
    current.text ||
    "";

  const status =
    get("memoBoxStatus")
      ?.value ||
    current.status ||
    "Active";

  memoBoxList[
    memoBoxActiveIndex
  ] = {
    name,
    text,
    status
  };

  saveMemoBoxes();

}

function useMemoForSearch() {

  saveMemoBoxCurrent();

  const box =
    get("repairSearch");

  if (!box) {
    return;
  }

  box.value =
    memoBoxList[
      memoBoxActiveIndex
    ].text;

}

function copyMemoBox() {

  saveMemoBoxCurrent();

  copyTextFallback(
    memoBoxList[
      memoBoxActiveIndex
    ].text
  );

}

function addMemoBox() {

  memoBoxList.push({

    name:
      `メモ${memoBoxList.length + 1}`,

    text: "",

    status:
      "Active"

  });

  memoBoxActiveIndex =
    memoBoxList.length - 1;

  saveMemoBoxes();

  showMemoBox();

}

function deleteMemoBox() {

  if (
    memoBoxList.length <= 1
  ) {
    return;
  }

  memoBoxList.splice(
    memoBoxActiveIndex,
    1
  );

  memoBoxActiveIndex =
    Math.max(
      0,
      memoBoxActiveIndex - 1
    );

  saveMemoBoxes();

  showMemoBox();

}

function showMemoBox() {

  normalizeMemoBoxes();

  const tabs =
    memoBoxList
      .map((item, index) => `
<button
  class="memo-tab ${
    index === memoBoxActiveIndex
      ? "active"
      : ""
  }"
  onclick="selectMemoBox(${index})">
${escapeHtml(item.name)}
</button>
`)
      .join("");

  const current =
    memoBoxList[
      memoBoxActiveIndex
    ];

  openFloatPanel(
    "MEMO BOX",
    `
<div class="memo-tabs">

${tabs}

<button
  class="memo-tab"
  onclick="addMemoBox()">
＋
</button>

</div>

<input
  id="memoBoxName"
  class="memo-name-input"
  value="${escapeHtml(current.name)}">

<br><br>

<select
  id="memoBoxStatus">

<option value="Active"
${
current.status === "Active"
? "selected"
: ""
}>
Active
</option>

<option value="TODO"
${
current.status === "TODO"
? "selected"
: ""
}>
TODO
</option>

<option value="Working"
${
current.status === "Working"
? "selected"
: ""
}>
Working
</option>

<option value="Done"
${
current.status === "Done"
? "selected"
: ""
}>
Done
</option>

<option value="Handoff"
${
current.status === "Handoff"
? "selected"
: ""
}>
Handoff
</option>

<option value="Archive"
${
current.status === "Archive"
? "selected"
: ""
}>
Archive
</option>

</select>

<textarea
  id="memoBoxText"
  class="memo-textarea"
  rows="12">${escapeHtml(current.text)}</textarea>

<div class="memo-actions">

<button onclick="saveMemoBoxCurrent()">
💾保存
</button>

<button onclick="useMemoForSearch()">
🔍検索
</button>

<button onclick="copyMemoBox()">
📋コピー
</button>

<button onclick="deleteMemoBox()">
🗑削除
</button>

<button onclick="exportMemoBoxes()">
Export
</button>

<button onclick="importMemoBoxes()">
Import
</button>

<input
  id="memoBoxImportFile"
  type="file"
  accept=".json"
  style="display:none"
  onchange="loadMemoBoxesFile(event)">

</div>
`
  );

}

function getMemoBoxList() {

  return memoBoxList || [];

}

function getActiveMemoBox() {

  return (
    memoBoxList[
      memoBoxActiveIndex
    ] ||
    null
  );

}

function exportMemoBoxes() {

  saveMemoBoxCurrent();

  downloadJsonFile(
    memoBoxList,
    "memo_boxes.json"
  );

}

function importMemoBoxes() {

  if (
    !confirm(
      "現在のメモを上書きします。続行しますか？"
    )
  ) {
    return;
  }

  const input =
    get("memoBoxImportFile");

  if (!input) {
    return;
  }

  input.value = "";

  input.click();

}

function loadMemoBoxesFile(
  event
) {

  const file =
    event.target.files?.[0];

  if (!file) {
    return;
  }

  readJsonFile(

    file,

    data => {

      if (!Array.isArray(data)) {
        alert("Memo JSON形式が不正です");
        return;
      }

      memoBoxList =
        data
          .map(item => ({
            name:
              item.name || "メモ",
            text:
              item.text || ""
          }));

      if (!memoBoxList.length) {
        memoBoxList = [
          {
            name: "メモ1",
            text: ""
          }
        ];
      }

      memoBoxActiveIndex = 0;

      saveMemoBoxes();

      showMemoBox();

      alert("Memo Import完了");

    },

    () => {
      alert("Memo JSON読込失敗");
    }

  );

  event.target.value =
    "";

}

function normalizeMemoBoxes() {

  memoBoxList =
    (memoBoxList || [])
      .map((memo, index) => ({
        name:
          memo.name ||
          "メモ" + (index + 1),

        text:
          memo.text || "",

        status:
          memo.status || "Active"
      }));

}

window.getMemoBoxList =
  getMemoBoxList;

window.getActiveMemoBox =
  getActiveMemoBox;

window.exportMemoBoxes =
  exportMemoBoxes;

window.importMemoBoxes =
  importMemoBoxes;

window.loadMemoBoxesFile =
  loadMemoBoxesFile;