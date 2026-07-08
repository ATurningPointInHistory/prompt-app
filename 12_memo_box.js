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

/* ===============================
   Type
   メモ・Knowledge Objectの種類
=============================== */

const MEMO_BOX_TYPES = [
  "Idea",             // アイデア・検討案
  "Rule",             // ルール・ポリシー
  "Design",           // 設計思想・設計原則
  "Core",             // Platform全体の基本原則
  "Architecture",     // アーキテクチャ設計
  "Specification",    // 正式仕様書
  "Implementation",   // 実装仕様・実装計画
  "Bug",              // 不具合・修正記録
  "Handoff",          // AI・開発引き継ぎ
  "Report",           // 調査・分析・レビュー
  "Guide"             // 利用ガイド・開発ガイド
];

/* ===============================
   Status
   文書・メモのライフサイクル
=============================== */

const MEMO_BOX_STATUSES = [
  "Inbox",        // 未整理
  "Active",       // 作業中
  "Draft",        // 下書き
  "Todo",         // 作成予定
  "Review",       // レビュー中
  "Done",         // 作業完了
  "Official",     // 現行の正式仕様
  "Historical",   // 設計履歴・参考資料
  "Hold",         // 保留
  "Rejected",     // 不採用
  "Archive"       // 保管のみ
];

/* ===============================
   Series
   文書シリーズ・Knowledge分類
=============================== */

const MEMO_BOX_SERIES = [
  "",             // Seriesなし
  "DESIGN",       // Design Philosophy
  "CORE",         // Platform Philosophy
  "ARCH",         // Architecture
  "KNOW",         // Knowledge Architecture
  "KNOWLEDGE",    // Knowledge Specification
  "META",         // Metadata
  "WORK",         // Workflow
  "RULE",         // Rule
  "MGR",          // Manager
  "ANLY",         // Analyzer
  "PLUG",         // Plugin
  "API",          // API
  "DB",           // Database
  "GUIDE"         // Guide
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

  const memo =
    getActiveMemoBox
      ? getActiveMemoBox()
      : memoBoxList[memoBoxActiveIndex];

  if (isMemoLocked(memo)) {
    console.warn("This memo is locked.");
    return false;
  }

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

    boxTitle:
      get("memoBoxBoxTitle")
        ?.value ||
      extractBoxHeaderTitle(
        get("memoBoxText")?.value || ""
      ) ||
      current.boxTitle ||
      "",

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

  const memo =
    memoBoxList[
      memoBoxActiveIndex
    ];

  copyTextFallback(
    buildMemoCopyText(memo)
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

  const memo =
    memoBoxList[memoBoxActiveIndex];

  if (isMemoLocked(memo)) {
    console.warn("This memo is locked and cannot be deleted.");
    return false;
  }

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

            ${item.boxTitle
        ? `<div class="small-muted">${escapeHtml(item.boxTitle)}</div>`
        : ""}

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

  const locked =
    !isNew &&
    isMemoLocked(current);

  const lockedAttr =
    locked
      ? "readonly"
      : "";

  const lockedDisabledAttr =
    locked
      ? "disabled"
      : "";

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
id="memoBoxBoxTitle"
class="input"
placeholder="Knowledge Object Title"
value="${escapeHtml(
  current.boxTitle ||
  extractBoxHeaderTitle(current.text || "")
)}" ${lockedAttr}>

<input
id="memoBoxId"
class="input"
placeholder="Knowledge ID"
value="${escapeHtml(current.id || "")}" ${lockedAttr}>

<input
id="memoBoxName"
class="memo-name-input"
placeholder="Memo title"
value="${escapeHtml(current.name || "")}"
onfocus="this.select()"
onclick="this.select()" ${lockedAttr}>

<details>
<summary>
Knowledge Metadata
</summary>

<textarea
id="memoBoxSummary"
class="input"
rows="1"
placeholder="Summary" ${lockedAttr}>${escapeHtml(current.summary || "")}</textarea>

<div class="memo-editor-meta-row">

<input
id="memoBoxCategory"
class="input"
placeholder="Category"
value="${escapeHtml(current.category || "")}" ${lockedAttr}>

<input
id="memoBoxVersion"
class="input"
placeholder="Version"
value="${escapeHtml(current.version || "")}" ${lockedAttr}>

</div>

<div class="memo-editor-meta-row">

<input
id="memoBoxPriority"
class="input"
placeholder="Priority"
value="${escapeHtml(current.priority || "")}" ${lockedAttr}>

<input
id="memoBoxStability"
class="input"
placeholder="Stability"
value="${escapeHtml(current.stability || "")}" ${lockedAttr}>

</div>

<input
id="memoBoxDecisionLevel"
class="input"
placeholder="Decision Level"
value="${escapeHtml(current.decisionLevel || "")}" ${lockedAttr}>

<div class="memo-editor-meta-row">

<select id="memoBoxType" ${lockedDisabledAttr}>
${MEMO_BOX_TYPES.map(v => `
<option
value="${v}"
${v === type ? "selected" : ""}>
${v}
</option>
`).join("")}
</select>

<select id="memoBoxStatus" ${lockedDisabledAttr}>
${MEMO_BOX_STATUSES.map(v => `
<option
value="${v}"
${v === status ? "selected" : ""}>
${v}
</option>
`).join("")}
</select>

<select id="memoBoxSeries" ${lockedDisabledAttr}>
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
value="${escapeHtml(keywords)}" ${lockedAttr}>

<input
id="memoBoxRelationships"
class="input"
placeholder="Relationships"
value="${escapeHtml(relationships)}" ${lockedAttr}>

</details>

<textarea
id="memoBoxText"
class="memo-textarea"
rows="20" 
${lockedAttr}>${escapeHtml(current.text || "")}</textarea>
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
    "memoBoxId",
    metadata.id
  );

  setMemoEditorValue(
    "memoBoxName",
    metadata.name
  );

  setMemoEditorValue(
    "memoBoxSummary",
    metadata.summary
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
    "memoBoxCategory",
    metadata.category
  );

  setMemoEditorValue(
    "memoBoxVersion",
    metadata.version
  );

  setMemoEditorValue(
    "memoBoxPriority",
    metadata.priority
  );

  setMemoEditorValue(
    "memoBoxStability",
    metadata.stability
  );

  setMemoEditorValue(
    "memoBoxDecisionLevel",
    metadata.decisionLevel
  );

  setMemoEditorValue(
    "memoBoxKeywords",
    Array.isArray(metadata.keywords)
      ? metadata.keywords.join(", ")
      : metadata.keywords
  );

  setMemoEditorValue(
    "memoBoxRelationships",
    Array.isArray(metadata.relationships)
      ? metadata.relationships.join(", ")
      : metadata.relationships
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

      setMemoEditorValue(
        "memoBoxBoxTitle",
        extractBoxHeaderTitle(text)
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

  if (
    index >= 0 &&
    index < memoBoxList.length &&
    isMemoLocked(memoBoxList[index])
  ) {
    console.warn("This memo is locked.");
    return false;
  }

  const text =
    get("memoBoxText")?.value || "";

  const metadata =
    typeof parseDocumentHeader ===
  "function"
      ? parseDocumentHeader(text)
      : {};

  const memo = {

    boxTitle:
      get("memoBoxBoxTitle")?.value ||
      extractBoxHeaderTitle(text) ||
      "",

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

  const lockedItems =
    [...memoBoxSelected].filter(index =>
      isMemoLocked(memoBoxList[index])
    );

  if (lockedItems.length) {
    alert(
      "ロック中のメモが含まれているため削除できません。"
    );
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

      boxTitle:
        item.boxTitle || "",

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
         locked
      ========================== */

      locked:
        item.locked === true,

      migrationLocked:
        item.migrationLocked === true,

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
    buildMemoCopyText(memo)
  );

}

function copyMemoTitleList() {

  normalizeMemoBoxes();

  const text =
    memoBoxList
      .map((memo, index) => {
        const no =
          String(index + 1).padStart(2, "0");

        const id =
          memo.id
            ? memo.id + " "
            : "";

        return `${no} ${id}${memo.name || "メモ"}`;
      })
      .join("\n");

  copyTextFallback(text);

}

function refreshMemoMetadataFromText() {

  normalizeMemoBoxes();

  memoBoxList =
    memoBoxList.map(memo => {

      if (
        typeof parseDocumentHeader !== "function"
      ) {
        return memo;
      }

      const metadata =
        parseDocumentHeader(
          memo.text || ""
        );

      if (
        !metadata.id &&
        !metadata.name
      ) {
        return memo;
      }

      return {
        ...memo,

        id:
          metadata.id || memo.id || "",

        name:
          metadata.name || memo.name || "メモ",

        summary:
          metadata.summary || memo.summary || "",

        knowledgeType:
          metadata.knowledgeType ||
          memo.knowledgeType ||
          memo.type ||
          "Memo",

        category:
          metadata.category || memo.category || "",

        status:
          metadata.status || memo.status || "Inbox",

        series:
          metadata.series || memo.series || "",

        priority:
          metadata.priority || memo.priority || "",

        stability:
          metadata.stability || memo.stability || "",

        decisionLevel:
          metadata.decisionLevel ||
          memo.decisionLevel ||
          "",

        version:
          metadata.version || memo.version || "",

        keywords:
          metadata.keywords?.length
            ? metadata.keywords
            : memo.keywords || [],

        relationships:
          metadata.relationships?.length
            ? metadata.relationships
            : memo.relationships || [],

        updatedAt:
          new Date().toISOString()

      };

    });

  saveMemoBoxes();
  showMemoBox();

  alert("Metadata更新完了");

}

function extractBoxHeaderTitle(text) {

  const match =
    String(text || "").match(
      /={5,}\s*\n\s*([^\n]+?)\s*\n\s*={5,}/
    );

  return match
    ? match[1].trim()
    : "";

}

function buildMemoCopyText(memo) {

  const body =
    memo?.text || "";

  const title =
    extractBoxHeaderTitle(body) ||
    memo?.name ||
    "メモ";

  return [
    title,
    "",
    body
  ].join("\n");

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

window.clearMemoSelection = 
clearMemoSelection;

window.deleteSelectedMemoBoxes = deleteSelectedMemoBoxes;

window.toggleMemoSelection = toggleMemoSelection;

window.copyMemoBox = copyMemoBox;

window.copyMemoTitleList =
  copyMemoTitleList;

window.refreshMemoMetadataFromText =
  refreshMemoMetadataFromText;