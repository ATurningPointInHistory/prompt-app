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
  "KNOWLEDGE",
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

let memoBoxLastDefaults =
  loadJson(
    "memoBoxLastDefaults",
    {}
  );

function saveMemoBoxLastDefaults(
  memo
) {

  memoBoxLastDefaults = {
    name:
      memo.name || "",
    type:
      memo.type || "Idea",
    status:
      memo.status || "Inbox",
    series:
      memo.series || ""
  };

  localStorage.setItem(
    "memoBoxLastDefaults",
    JSON.stringify(memoBoxLastDefaults)
  );

}

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
    !get("memoBoxName") ||
    !get("memoBoxText")
  ) {
    return;
  }

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

      ${item.id
        ? `<div class="small-muted">${escapeHtml(item.id)}</div>`
        : ""}

      ${escapeHtml(item.name || "メモ")}

    </div>

    <div class="memo-card-meta">

      <span>${escapeHtml(item.knowledgeType || item.type || "-")}</span>
      <span>${escapeHtml(item.status || "-")}</span>
      <span>${escapeHtml(item.series || "-")}</span>

      ${item.version
        ? `<span>v${escapeHtml(item.version)}</span>`
        : ""}

    </div>

    ${item.createdAt
      ? `
    <div class="small-muted memo-card-date">
      ${escapeHtml(item.createdAt)}
    </div>
    `
      : ""}

    ${item.keywords?.length
      ? `
    <div class="small-muted memo-card-keywords">
      ${escapeHtml(item.keywords.join(", "))}
    </div>
    `
      : ""}

    ${item.relationships?.length
      ? `
    <div class="memo-card-links">

    ${item.relationships
      .map(id => `
      <button
      class="memo-link-btn"
      onclick="
      event.stopPropagation();
      openMemoById('${escapeJs(id)}');
      ">
      ${escapeHtml(id)}
      </button>
      `)
      .join("")}

    </div>
    `
      : ""}

  </div>

  <div class="memo-card-actions">

    <button onclick="openMemoEditor(${index})">
      ✏編集
    </button>

    <button onclick="
      event.stopPropagation();
      copyMemoBoxByIndex(${index});
    ">
      📋コピー
    </button>

  </div>

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
      ? memoBoxLastDefaults || {}
      : memoBoxList[index] || {};

  const type =
    current.type ||
    current.knowledgeType ||
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

  const relationships =
    (
      current.relationships || []
    ).join(", ");

  openFloatPanel(
    isNew ? "MEMO EDIT - NEW" : "MEMO EDIT",
`
<input
id="memoEditorIndex"
type="hidden"
value="${isNew ? "" : index}">

<div class="memo-editor-top-actions">

<button onclick="saveMemoEditor()">
💾保存
</button>

<button onclick="showMemoBox()">
←戻る
</button>

<button onclick="pasteMemoText()">
📋本文
</button>

<button onclick="selectMemoTitle()">
🔤題名
</button>

</div>

<input
id="memoBoxId"
class="input"
placeholder="Knowledge ID"
value="${escapeHtml(current.id || "")}">

<input
id="memoBoxName"
class="memo-name-input"
placeholder="Memo title"
value="${escapeHtml(current.name || "")}"
onfocus="this.select()"
onclick="this.select()">

<details>
<summary>
Knowledge Metadata
</summary>

<textarea
id="memoBoxSummary"
class="input"
rows="1"
placeholder="Summary">${escapeHtml(current.summary || "")}</textarea>

<div class="memo-editor-meta-row">

<input
id="memoBoxCategory"
class="input"
placeholder="Category"
value="${escapeHtml(current.category || "")}">

<input
id="memoBoxVersion"
class="input"
placeholder="Version"
value="${escapeHtml(current.version || "")}">

</div>

<div class="memo-editor-meta-row">

<input
id="memoBoxPriority"
class="input"
placeholder="Priority"
value="${escapeHtml(current.priority || "")}">

<input
id="memoBoxStability"
class="input"
placeholder="Stability"
value="${escapeHtml(current.stability || "")}">

</div>

<input
id="memoBoxDecisionLevel"
class="input"
placeholder="Decision Level"
value="${escapeHtml(current.decisionLevel || "")}">

<div class="memo-editor-meta-row">

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

<input
id="memoBoxRelationships"
class="input"
placeholder="Relationships"
value="${escapeHtml(relationships)}">

</details>

<textarea
id="memoBoxText"
class="memo-textarea"
rows="20">${escapeHtml(current.text || "")}</textarea>
`
  );

}

function selectMemoTitle() {

  const input =
    get("memoBoxName");

  if (!input) {
    return;
  }

  input.focus();
  input.select();

}

function applyDocumentHeaderToMemoEditor(
  text
) {

  if (
    typeof parseDocumentHeader !== "function"
  ) {
    return;
  }

  const metadata =
    parseDocumentHeader(text);

  setMemoEditorValue(
    "memoBoxName",
    metadata.name
  );

  setMemoEditorValue(
    "memoBoxType",
    metadata.knowledgeType
  );

  setMemoEditorValue(
    "memoBoxStatus",
    metadata.status
  );

  setMemoEditorValue(
    "memoBoxSeries",
    metadata.series
  );

  setMemoEditorValue(
    "memoBoxKeywords",
    Array.isArray(metadata.keywords)
      ? metadata.keywords.join(", ")
      : metadata.keywords
  );
  window.memoBoxParsedMetadata =
    metadata;

}

function setMemoEditorValue(
  id,
  value
) {

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return;
  }

  const el =
    get(id);

  if (!el) {
    return;
  }

  el.value =
    String(value);

}

async function pasteMemoText() {

  try {

    const text =
      await navigator
        .clipboard
        .readText();

    const textarea =
      get("memoBoxText");

    if (textarea) {

      textarea.value = text;

      applyDocumentHeaderToMemoEditor(
        text
      );

    }

    const input =
      get("memoBoxName");

    if (
      input &&
      !input.value
    ) {

      input.value =
        extractMemoTitle(
          text
        );

      input.focus();

      input.select();

    }

  } catch (error) {

    alert(
      "クリップボードを読み取れません。"
    );

  }

}

function extractMemoTitle(
  text
) {

  const lines =
    String(text || "")
      .split(/\r?\n/)
      .map(line =>
        line.trim()
      )
      .filter(line =>
        line &&
        !/^=+$/.test(line)
      );

  const specPattern =
    /Specification/i;

  const idPattern =
    /^[A-Z][A-Z0-9_-]*-\d+$/;

  for (
    let i = 0;
    i < lines.length;
    i++
  ) {

    if (
      specPattern.test(lines[i]) &&
      lines[i + 1] &&
      idPattern.test(lines[i + 1])
    ) {

      if (
        lines[i + 2] &&
        !specPattern.test(lines[i + 2]) &&
        !idPattern.test(lines[i + 2])
      ) {
        return `${lines[i + 1]} ${lines[i + 2]}`;
      }

      return `${lines[i]} ${lines[i + 1]}`;

    }

  }

  for (
    const line of lines
  ) {

    if (
      /Specification\s+\d+/i
        .test(line)
    ) {
      return line;
    }

  }

  return (
    lines[0] ||
    "メモ"
  );

}

function saveMemoEditor() {

  normalizeMemoBoxes();

  const indexText =
    get("memoEditorIndex")?.value || "";

  const index =
    indexText === ""
      ? -1
      : Number(indexText);

  const text =
    get("memoBoxText")?.value || "";

  const metadata =
    typeof parseDocumentHeader ===
  "function"
      ? parseDocumentHeader(text)
      : {};

  const memo = {

    id:
      metadata.id ||
      get("memoBoxId")?.value ||
      "",

    name:
      get("memoBoxName")?.value || "メモ",

    summary:
      metadata.summary ||
      get("memoBoxSummary")?.value ||
      "",

    text:
      text,

    knowledgeType:
      metadata.knowledgeType ||
      get("memoBoxType")?.value ||
      "Memo",

    category:
      metadata.category ||
      get("memoBoxCategory")?.value ||
      "",

    type:
      get("memoBoxType")?.value || "Idea",

    status:
      metadata.status ||
      get("memoBoxStatus")?.value ||
      "Inbox",

    series:
      metadata.series ||
      get("memoBoxSeries")?.value ||
      "",

    priority:
      metadata.priority ||
      get("memoBoxPriority")?.value ||
      "",

    stability:
      metadata.stability ||
      get("memoBoxStability")?.value ||
      "",

    decisionLevel:
      metadata.decisionLevel ||
      get("memoBoxDecisionLevel")?.value ||
      "",

    version:
      metadata.version ||
      get("memoBoxVersion")?.value ||
      "",

    keywords:
      metadata.keywords?.length
        ? metadata.keywords
        : String(
            get("memoBoxKeywords")?.value || ""
          )
            .split(",")
            .map(v => v.trim())
            .filter(Boolean),

    relationships:
      metadata.relationships?.length
        ? metadata.relationships
        : String(
            get("memoBoxRelationships")?.value || ""
          )
            .split(",")
            .map(v => v.trim())
            .filter(Boolean),

    createdAt:
      metadata.createdAt ||
      memoBoxList[index]?.createdAt ||
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString()

  };

    if (
      index >= 0 &&
      index < memoBoxList.length
    ) {

      memoBoxList[index] = {
        ...memoBoxList[index],
        ...memo
      };

      memoBoxActiveIndex = index;

    } else {

      memoBoxList.unshift(memo);
      memoBoxActiveIndex = 0;

    }

    saveMemoBoxLastDefaults(
      memo
    );

    window.memoBoxParsedMetadata =
      null;

    normalizeMemoBoxes();
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
        data.map(item => ({
          ...item,
          name:
            item.name || "メモ",
          text:
            item.text || ""
        }));

      normalizeMemoBoxes();

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

      /* ==========================
         Basic
      ========================== */

      id:
        item.id || "",

      name:
        item.name || "",

      summary:
        item.summary || "",

      text:
        item.text || "",

      /* ==========================
         Knowledge
      ========================== */

      knowledgeType:
        item.knowledgeType ||

        item.type ||

        "Memo",

      category:
        item.category || "",

      /* ==========================
         Memo
      ========================== */

      type:
        item.type || "Idea",

      status:
        item.status || "Inbox",

      series:
        item.series || "",

      /* ==========================
         Metadata
      ========================== */

      priority:
        item.priority || "",

      stability:
        item.stability || "",

      decisionLevel:
        item.decisionLevel || "",

      version:
        item.version || "",

      /* ==========================
         Relations
      ========================== */

      keywords:
        Array.isArray(
          item.keywords
        )
          ? item.keywords
          : [],

      relationships:
        Array.isArray(
          item.relationships
        )
          ? item.relationships
          : [],

      /* ==========================
         History
      ========================== */

      createdAt:
        item.createdAt || "",

      updatedAt:
        item.updatedAt || ""

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
      item.id,
      item.name,
      item.summary,
      item.text,
      item.knowledgeType,
      item.category,
      item.type,
      item.status,
      item.series,
      item.priority,
      item.stability,
      item.decisionLevel,
      item.version,
      ...(item.keywords || []),
      ...(item.relationships || [])
    ]
    .join(" ")
    .toLowerCase();

    return text.includes(keyword);

  });

}

function findMemoById(id) {

  return memoBoxList.find(
    memo => memo.id === id
  ) || null;

}

function openMemoById(id) {

  const index =
    memoBoxList.findIndex(
      memo => memo.id === id
    );

  if (index < 0) {

    alert(
      "Knowledge Objectが見つかりません。\n\n" +
      id
    );

    return;

  }

  openMemoEditor(index);

}

function copyMemoBoxByIndex(index) {

  const memo =
    memoBoxList[index];

  if (!memo) {
    return;
  }

  copyTextFallback(
    memo.text || ""
  );

}

window.findMemoById =
  findMemoById;

window.openMemoById =
  openMemoById;

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

window.copyMemoBoxByIndex =
  copyMemoBoxByIndex;

window.openMemoEditor = openMemoEditor;
window.saveMemoEditor = saveMemoEditor;
window.pasteMemoText = pasteMemoText;
window.selectMemoTitle = selectMemoTitle;

window.deleteMemoBox = deleteMemoBox;
window.selectAllMemoBoxes = selectAllMemoBoxes;
window.clearMemoSelection = clearMemoSelection;
window.deleteSelectedMemoBoxes = deleteSelectedMemoBoxes;
window.toggleMemoSelection = toggleMemoSelection;
window.copyMemoBox = copyMemoBox; = copyMemoBox;