/* ===============================
   12_memo_box.js
=============================== */

let memoBoxActiveIndex =
  0;

let memoBoxStatusFilter =
  "";

let memoBoxSearch =
  "";

let memoBoxTypeFilter =
  "";

let memoBoxSeriesFilter =
  "";

let memoBoxSelected =
  new Set();

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

  const filtered =
    filterMemoBoxes();

  const memoCards =
    filtered
      .map(item => {

        const index =
          memoBoxList.indexOf(item);

        return `
<div class="memo-card ${
  index === memoBoxActiveIndex
    ? "active"
    : ""
}">

  <div class="memo-card-select">
    <input
      type="checkbox"
      ${
        memoBoxSelected.has(index)
          ? "checked"
          : ""
      }
      onclick="event.stopPropagation()"
      onchange="
        toggleMemoSelection(
          ${index},
          this.checked
        )
      ">
  </div>

  <div
    class="memo-card-body"
    onclick="selectMemoBox(${index})">

    <div class="memo-card-title">
      ${escapeHtml(item.name || "メモ")}
    </div>

    <div class="memo-card-meta">
      <span>${escapeHtml(item.type || "Idea")}</span>
      <span>${escapeHtml(item.status || "Inbox")}</span>
      <span>${escapeHtml(item.series || "-")}</span>
    </div>

    <div class="memo-card-keywords">
      ${escapeHtml(
        Array.isArray(item.keywords)
          ? item.keywords.join(", ")
          : ""
      )}
    </div>

  </div>

  <button onclick="openMemoEditor(${index})">
    ✏編集
  </button>

</div>
`;

      })
      .join("");

  openFloatPanel(
    "MEMO BOX",
`
<div class="memo-actions">

<button onclick="openMemoEditor()">
＋新規
</button>

<button onclick="saveMemoBoxes()">
💾保存
</button>

<button onclick="copyMemoBox()">
📋コピー
</button>

<button onclick="deleteMemoBox()">
🗑削除
</button>

<button onclick="selectAllMemoBoxes()">
☑All
</button>

<button onclick="clearMemoSelection()">
☐Clear
</button>

<button onclick="deleteSelectedMemoBoxes()">
🗑選択削除
</button>

<button onclick="exportMemoBoxes()">
Export
</button>

<button onclick="importMemoBoxes()">
Import
</button>

</div>

<hr>

<details>
<summary>
Filter / Search
</summary>

<div class="memo-filter">

<select
id="memoFilterType"
onchange="
memoBoxTypeFilter=this.value;
showMemoBox();
">

<option value="">
Type: All
</option>

${MEMO_BOX_TYPES.map(v => `
<option
value="${v}"
${memoBoxTypeFilter === v ? "selected" : ""}>
Type: ${v}
</option>
`).join("")}

</select>

<select
id="memoFilterStatus"
onchange="
memoBoxStatusFilter=this.value;
showMemoBox();
">

<option value="">
Status: All
</option>

${MEMO_BOX_STATUSES.map(v => `
<option
value="${v}"
${memoBoxStatusFilter === v ? "selected" : ""}>
Status: ${v}
</option>
`).join("")}

</select>

<select
id="memoFilterSeries"
onchange="
memoBoxSeriesFilter=this.value;
showMemoBox();
">

<option value="">
Series: All
</option>

${MEMO_BOX_SERIES.map(v => `
<option
value="${v}"
${memoBoxSeriesFilter === v ? "selected" : ""}>
Series: ${v || "なし"}
</option>
`).join("")}

</select>

<input
id="memoSearch"
class="input"
placeholder="Search"
value="${escapeHtml(memoBoxSearch)}"
oninput="
memoBoxSearch=this.value;
showMemoBox();
">

</div>

</details>

<div class="memo-list">

${memoCards || `
<div class="small-muted">
該当メモなし
</div>
`}

</div>

<input
id="memoBoxImportFile"
type="file"
accept=".json"
style="display:none"
onchange="loadMemoBoxesFile(event)">
`
  );

}

function openMemoEditor(index = null) {

  normalizeMemoBoxes();

  const isNew =
    index === null ||
    index === undefined ||
    index < 0;

  const current =
    isNew
      ? {}
      : memoBoxList[index] || {};

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
    isNew ? "MEMO EDIT - NEW" : "MEMO EDIT",
`
<input
id="memoEditorIndex"
type="hidden"
value="${isNew ? "" : index}">

<input
id="memoBoxName"
class="memo-name-input"
placeholder="Memo title"
value="${escapeHtml(current.name || "")}">

<br><br>

<div class="memo-meta">

<select id="memoBoxType">
${MEMO_BOX_TYPES.map(v => `
<option
value="${v}"
${v === type ? "selected" : ""}>
${v}
</option>
`).join("")}
</select>

<select id="memoBoxStatus">
${MEMO_BOX_STATUSES.map(v => `
<option
value="${v}"
${v === status ? "selected" : ""}>
${v}
</option>
`).join("")}
</select>

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
rows="16">${escapeHtml(current.text || "")}</textarea>

<div class="memo-actions">

<button onclick="saveMemoEditor()">
💾保存
</button>

<button onclick="showMemoBox()">
←戻る
</button>

</div>
`
  );

}

function saveMemoEditor() {

  const indexText =
    get("memoEditorIndex")?.value || "";

  const index =
    indexText === ""
      ? -1
      : Number(indexText);

  const memo = {
    name:
      get("memoBoxName")?.value || "メモ",

    type:
      get("memoBoxType")?.value || "Idea",

    status:
      get("memoBoxStatus")?.value || "Inbox",

    series:
      get("memoBoxSeries")?.value || "",

    keywords:
      String(
        get("memoBoxKeywords")?.value || ""
      )
        .split(",")
        .map(v => v.trim())
        .filter(Boolean),

    text:
      get("memoBoxText")?.value || ""
  };

  if (
    index >= 0 &&
    memoBoxList[index]
  ) {
    memoBoxList[index] = memo;
    memoBoxActiveIndex = index;
  } else {
    memoBoxList.unshift(memo);
    memoBoxActiveIndex = 0;
  }

  saveMemoBoxes();
  showMemoBox();

}

function toggleMemoSelection(
  index,
  checked
) {

  if (checked) {
    memoBoxSelected.add(index);
  } else {
    memoBoxSelected.delete(index);
  }

}

function selectAllMemoBoxes() {

  memoBoxSelected.clear();

  memoBoxList.forEach(
    (_, index) =>
      memoBoxSelected.add(index)
  );

  showMemoBox();

}

function clearMemoSelection() {

  memoBoxSelected.clear();

  showMemoBox();

}

function deleteSelectedMemoBoxes() {

  if (
    !memoBoxSelected.size
  ) {
    alert("選択されていません");
    return;
  }

  if (
    !confirm(
      `${memoBoxSelected.size}件削除しますか？`
    )
  ) {
    return;
  }

  memoBoxList =
    memoBoxList.filter(
      (_, index) =>
        !memoBoxSelected.has(index)
    );

  memoBoxSelected.clear();

  memoBoxActiveIndex = 0;

  saveMemoBoxes();

  showMemoBox();

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

function filterMemoBoxes() {

  const keyword =
    memoBoxSearch
      .trim()
      .toLowerCase();

  return memoBoxList.filter(item => {

    if (
      memoBoxStatusFilter &&
      item.status !== memoBoxStatusFilter
    ) {
      return false;
    }

    if (
      memoBoxTypeFilter &&
      item.type !== memoBoxTypeFilter
    ) {
      return false;
    }

    if (
      memoBoxSeriesFilter &&
      item.series !== memoBoxSeriesFilter
    ) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    const text =
      [
        item.name,
        item.text,
        ...(item.keywords || [])
      ]
        .join(" ")
        .toLowerCase();

    return text.includes(keyword);

  });

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

window.showMemoBox =
  showMemoBox;

window.selectMemoBox =
  selectMemoBox;

window.saveMemoBoxCurrent =
  saveMemoBoxCurrent;