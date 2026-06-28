/* ===============================
   12_memo_box.js
=============================== */

let memoBoxActiveIndex =
  0;

let memoBoxStatusFilter =
  "";

let memoBoxSearch =
  "";

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

const MEMO_BOX_STATUSES = [
  "Inbox",
  "Active",
  "Draft",
  "Todo",
  "Review",
  "Done",
  "Official",
  "Hold",
  "Rejected",
  "Archive"
];

const MEMO_BOX_TYPES = [
  "Idea",
  "Rule",
  "Design",
  "Core",
  "Architecture",
  "Specification",
  "Implementation",
  "Bug",
  "Handoff",
  "Report",
  "Guide"
];

const MEMO_BOX_STATUSES = [
  "Inbox",
  "Draft",
  "Review",
  "Adopted",
  "Official",
  "Hold",
  "Rejected",
  "Archived"
];

const MEMO_BOX_SERIES = [
  "",
  "DESIGN",
  "CORE",
  "ARCH",
  "KNOW",
  "META",
  "WORK",
  "RULE",
  "MGR",
  "ANLY",
  "PLUG",
  "API",
  "DB",
  "GUIDE"
];

/* ===============================
   Memo Box
=============================== */

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

  memoBoxList[
    memoBoxActiveIndex
  ] = {

    ...current,

    name:
      get("memoBoxName")
        ?.value || "",

    text:
      get("memoBoxText")
        ?.value || "",

    type:
      get("memoBoxType")
        ?.value ||

      current.type ||

      "Idea",

    status:
      get("memoBoxStatus")
        ?.value ||

      current.status ||

      "Inbox",

    series:
      get("memoBoxSeries")
        ?.value ||

      current.series ||

      "",

    keywords:
      (
        get("memoBoxKeywords")
          ?.value || ""
      )
        .split(",")
        .map(v => v.trim())
        .filter(Boolean),

    updatedAt:
      new Date().toISOString()

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
${escapeHtml(item.name || "メモ")}
</button>
`)
      .join("");

  const current =
    memoBoxList[
      memoBoxActiveIndex
    ] || {};

  const type =
    current.type ||
    "Idea";

  const status =
    current.status ||
    "Inbox";

  const series =
    current.series ||
    "";

  const keywords =
    (
      current.keywords || []
    ).join(", ");

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
  value="${escapeHtml(current.name || "")}">

<br><br>

<div class="memo-meta">

Type
<select id="memoBoxType">
${MEMO_BOX_TYPES.map(v => `
<option
value="${v}"
${v === type ? "selected" : ""}>
${v}
</option>
`).join("")}
</select>

Status
<select id="memoBoxStatus">
${MEMO_BOX_STATUSES.map(v => `
<option
value="${v}"
${v === status ? "selected" : ""}>
${v}
</option>
`).join("")}
</select>

Series
<select id="memoBoxSeries">
${MEMO_BOX_SERIES.map(v => `
<option
value="${v}"
${v === series ? "selected" : ""}>
${v || "Seriesなし"}
</option>
`).join("")}
</select>

</div>

<input
  id="memoBoxKeywords"
  class="input"
  placeholder="tag1, tag2"
  value="${escapeHtml(keywords)}">

<textarea
  id="memoBoxText"
  class="memo-textarea"
  rows="12">${escapeHtml(current.text || "")}</textarea>

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
    (memoBoxList || []).map(item => ({

      name:
        item.name || "",

      text:
        item.text || "",

      type:
        item.type || "Idea",

      status:
        item.status || "Inbox",

      series:
        item.series || "",

      keywords:
        Array.isArray(
          item.keywords
        )
          ? item.keywords
          : [],

      updatedAt:
        item.updatedAt ||
        ""

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