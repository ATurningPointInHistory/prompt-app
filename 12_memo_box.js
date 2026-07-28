/* ===============================
   FILE: 12_memo_box.js
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

let memoBoxModeFilter =
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

const MEMO_BOX_MODES = [
  "knowledge",
  "simple",
  "document",
  "relation"
];

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
      get("memoBoxBoxTitle")?.value ||
      extractBoxHeaderTitle(
        get("memoBoxText")?.value || ""
      ) ||
      current.boxTitle ||
      "",

    id:
      get("memoBoxId")?.value ||
      current.id ||
      "",

    name:
      get("memoBoxName")?.value ||
      "",

    summary:
      get("memoBoxSummary")?.value ||
      current.summary ||
      "",

    text:
      get("memoBoxText")?.value ||
      "",

    knowledgeType:
      get("memoBoxType")?.value ||
      current.knowledgeType ||
      current.type ||
      "Memo",

    category:
      get("memoBoxCategory")?.value ||
      current.category ||
      "",

    type:
      get("memoBoxType")?.value ||
      current.type ||
      "Idea",

    status:
      get("memoBoxStatus")?.value ||
      current.status ||
      "Inbox",

    series:
      get("memoBoxSeries")?.value ||
      current.series ||
      "",

    priority:
      get("memoBoxPriority")?.value ||
      current.priority ||
      "",

    stability:
      get("memoBoxStability")?.value ||
      current.stability ||
      "",

    decisionLevel:
      get("memoBoxDecisionLevel")?.value ||
      current.decisionLevel ||
      "",

    version:
      get("memoBoxVersion")?.value ||
      current.version ||
      "",

    keywords:
      normalizeMemoArrayValue(
        get("memoBoxKeywords")?.value
      ),

    relationships:
      normalizeMemoArrayValue(
        get("memoBoxRelationships")?.value
      ),

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

  const defaults =
    memoBoxLastDefaults || {};

  memoBoxList.push({

    name:
      `メモ${memoBoxList.length + 1}`,

    text: "",

    type:
      defaults.type || "Idea",

    status:
      defaults.status || "Active",

    series:
      defaults.series || "",

    keywords: [],

    relationships: [],

    createdAt:
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString()

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

  deleteMemo(
    memoBoxActiveIndex
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

    <button
      class="memo-lock-btn"
      onclick="
        event.stopPropagation();
        toggleMemoLock(${index});
      ">
      ${isMemoLocked(item) ? "🔏" : "🖋"}
    </button>

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

      ${isMemoLocked(item) ? "🔏 " : "🖋 "}
      ${escapeHtml(getMemoDisplayName(item))}

    </div>

    <div class="memo-card-meta">

      <span>${escapeHtml(item.memoMode || inferMemoMode(item))}</span>
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
      ${isMemoLocked(item)
        ? "🔏ロック中"
        : "🖋編集"}
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

<button onclick="lockSelectedMemoBoxes()">
🔒選択ロック
</button>

<button onclick="unlockSelectedMemoBoxes()">
🔓選択ロック解除
</button>

<span class="small-muted">
選択: ${memoBoxSelected.size}件
</span>

<button onclick="deleteSelectedMemoBoxes()">
🗑選択削除
</button>

<button onclick="exportMemoBoxes()">
Export
</button>

<button onclick="exportSelectedMemoBoxes()">
選択Export
</button>

<button onclick="importMemoBoxes('merge')">
追加Import
</button>

<button onclick="importMemoBoxes('replace')">
全置換Import
</button>

</div>

<hr>

<details>
<summary>
Filter / Search
</summary>

<div class="memo-filter">


<select
id="memoFilterMode"
onchange="
memoBoxModeFilter=this.value;
showMemoBox();
">

<option value="">
Mode: All
</option>

${MEMO_BOX_MODES.map(v => `
<option
value="${v}"
${memoBoxModeFilter === v ? "selected" : ""}>
Mode: ${v}
</option>
`).join("")}

</select>

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
accept=".json,.md,.markdown,.txt,.html,.htm,.csv,.tsv"
multiple
style="display:none"
onchange="loadMemoBoxesFile(event)">
`
  );

}

function openMemoEditor(index = null) {

  window.memoBoxParsedMetadata = {};

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

<button onclick="readMemoMetadataFromBody()">
🔄本文からMetadata読取
</button>

<button onclick="selectMemoTitle()">
🔤題名
</button>

</div>


<select
id="memoBoxMode"
onchange="updateMemoEditorModeVisibility()"
${lockedDisabledAttr}>
${MEMO_BOX_MODES.map(v => `
<option
value="${v}"
${v === (current.memoMode || inferMemoMode(current)) ? "selected" : ""}>
${v}
</option>
`).join("")}
</select>

<div id="memoKnowledgeIdentityFields">

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

</div>

<input
id="memoBoxName"
class="memo-name-input"
placeholder="Memo title"
value="${escapeHtml(current.name || "")}"
onfocus="this.select()"
onclick="this.select()" ${lockedAttr}>

<details id="memoKnowledgeMetadataFields">
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
    getMemoMetadataTitle(metadata)
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

  window.memoBoxParsedMetadata = {};

  try {

    const text =
      await navigator
        .clipboard
        .readText();

    const textarea =
      get("memoBoxText");

    if (textarea) {

      textarea.value = text;

      setMemoEditorValue(
        "memoBoxBoxTitle",
        extractBoxHeaderTitle(text)
      );

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

function readMemoMetadataFromBody() {

  const mode =
    get("memoBoxMode")?.value || "simple";

  if (mode !== "knowledge") {
    window.memoBoxParsedMetadata = {};
    alert("本文からMetadataを読み取れるのはKnowledge Memoだけです。");
    return;
  }

  const text =
    get("memoBoxText")?.value || "";

  if (!text.trim()) {
    alert("本文が空です");
    return;
  }

  applyDocumentHeaderToMemoEditor(text);

  if (
    !window.memoBoxParsedMetadata ||
    !Object.keys(window.memoBoxParsedMetadata).length
  ) {
    alert("Metadataを検出できませんでした");
    return;
  }

  alert("本文からMetadata候補を読み取りました。内容を確認して保存してください。");
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

  const selectedMode =
    get("memoBoxMode")?.value ||
    inferMemoMode({
      type: get("memoBoxType")?.value,
      knowledgeType: get("memoBoxType")?.value
    });

  const metadata =
    selectedMode === "knowledge"
      ? sanitizeMemoParsedMetadata(
          window.memoBoxParsedMetadata || {}
        )
      : {};

  const memo = {

    memoMode:
      selectedMode,

    boxTitle:
      get("memoBoxBoxTitle")?.value ||
      extractBoxHeaderTitle(text) ||
      "",

    id:
      metadata.id ||
      get("memoBoxId")?.value ||
      "",

    name:
      getMemoMetadataTitle(metadata) ||
      get("memoBoxName")?.value ||
      "メモ",

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
        ? normalizeMemoArrayValue(metadata.keywords)
        : normalizeMemoArrayValue(
            get("memoBoxKeywords")?.value || ""
          ),

    relationships:
      metadata.relationships?.length
        ? normalizeMemoArrayValue(metadata.relationships)
        : normalizeMemoArrayValue(
            get("memoBoxRelationships")?.value || ""
          ),

    createdAt:
      getMemoMetadataCreated(metadata) ||
      memoBoxList[index]?.createdAt ||
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString()

  };

    if (
      index >= 0 &&
      index < memoBoxList.length
    ) {

      updateMemo(
        index,
        memo
      );

      memoBoxActiveIndex = index;

    } else {

      memoBoxActiveIndex =
        createMemo(memo);

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

function lockSelectedMemoBoxes() {

  if (!memoBoxSelected.size) {
    alert("選択されていません");
    return;
  }

  let changed = 0;
  let skipped = 0;

  [...memoBoxSelected].forEach(index => {
    const memo = memoBoxList[index];
    if (!memo) return;

    if (memo.migrationLocked === true) {
      skipped++;
      return;
    }

    if (memo.locked !== true) {
      memo.locked = true;
      memo.updatedAt = new Date().toISOString();
      changed++;
    }
  });

  saveMemoBoxes();
  showMemoBox();

  alert(
    `選択ロック完了: ${changed}件` +
    (skipped ? `\nMigration Lock除外: ${skipped}件` : "")
  );

}

function unlockSelectedMemoBoxes() {

  if (!memoBoxSelected.size) {
    alert("選択されていません");
    return;
  }

  let changed = 0;
  let skipped = 0;

  [...memoBoxSelected].forEach(index => {
    const memo = memoBoxList[index];
    if (!memo) return;

    if (memo.migrationLocked === true) {
      skipped++;
      return;
    }

    if (memo.locked === true) {
      memo.locked = false;
      memo.updatedAt = new Date().toISOString();
      changed++;
    }
  });

  saveMemoBoxes();
  showMemoBox();

  alert(
    `選択ロック解除完了: ${changed}件` +
    (skipped ? `\nMigration Lock除外: ${skipped}件` : "")
  );

}

function deleteSelectedMemoBoxes() {

  if (
    !memoBoxSelected.size
  ) {
    alert("選択されていません");
    return;
  }

  const indexes =
    [...memoBoxSelected]
      .sort((a, b) => b - a);

  const lockedItems =
    indexes.filter(index =>
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

  let deleted = 0;

  indexes.forEach(index => {

    if (
      typeof deleteMemo === "function" &&
      deleteMemo(index)
    ) {
      deleted++;
    }

  });

  memoBoxSelected.clear();

  memoBoxActiveIndex = 0;

  saveMemoBoxes();

  showMemoBox();

  console.log(
    "Selected memos deleted:",
    deleted
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

function importMemoBoxes(mode = "merge") {

  window.memoBoxImportMode =
    mode === "replace"
      ? "replace"
      : "merge";

  if (
    window.memoBoxImportMode === "replace" &&
    !confirm(
      "現在のメモを全置換します。バックアップ済みですか？"
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

function readMemoImportFile(file) {

  return new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.onload = () => {
      try {
        resolve({
          file,
          text: String(reader.result || "")
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error || new Error("read failed"));
    reader.readAsText(file);

  });

}

function normalizeImportedMemoItem(item, source = {}) {

  const raw =
    item && typeof item === "object"
      ? item
      : {};

  const text =
    String(raw.text ?? raw.content ?? raw.body ?? "");

  return {
    ...raw,
    memoMode:
      raw.memoMode ||
      inferMemoMode(raw),
    name: (() => {
      const explicitName =
        String(raw.name || raw.title || "").trim();

      if (
        explicitName &&
        !isSuspiciousMemoTitle(explicitName)
      ) {
        return explicitName;
      }

      return source.fileName || "メモ";
    })(),
    text,
    sourceFileName:
      raw.sourceFileName ||
      source.fileName ||
      "",
    sourceFormat:
      raw.sourceFormat ||
      source.format ||
      "",
    importedAt:
      raw.importedAt ||
      new Date().toISOString()
  };

}

function parseMemoImportText(file, text) {

  const fileName = file.name || "imported";
  const extension =
    fileName.includes(".")
      ? fileName.split(".").pop().toLowerCase()
      : "";

  if (extension === "json") {

    const parsed = JSON.parse(text);

    let items = [];

    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (Array.isArray(parsed.memos)) {
      items = parsed.memos;
    } else if (Array.isArray(parsed.memoBoxList)) {
      items = parsed.memoBoxList;
    } else if (parsed && typeof parsed === "object") {
      items = [parsed];
    }

    return items.map(item =>
      normalizeImportedMemoItem(item, {
        fileName,
        format: "json"
      })
    );

  }

  return [normalizeImportedMemoItem({
    memoMode: "document",
    id: "",
    name: fileName,
    summary: "",
    text,
    knowledgeType: "Document",
    category: "Imported Document",
    type: "Document",
    status: "Inbox",
    series: "",
    version: "",
    keywords: [],
    relationships: []
  }, {
    fileName,
    format: extension || "text"
  })];

}

async function loadMemoBoxesFile(event) {

  const files =
    Array.from(event.target.files || []);

  if (!files.length) {
    return;
  }

  const imported = [];
  const failures = [];

  for (const file of files) {

    try {
      const result =
        await readMemoImportFile(file);

      imported.push(
        ...parseMemoImportText(
          file,
          result.text
        )
      );
    } catch (error) {
      failures.push({
        fileName: file.name,
        message: error?.message || String(error)
      });
    }

  }

  if (!imported.length) {
    alert("Importできるファイルがありませんでした");
    event.target.value = "";
    return;
  }

  const mode =
    window.memoBoxImportMode || "merge";

  if (mode === "replace") {
    memoBoxList = imported;
  } else {
    memoBoxList = [
      ...memoBoxList,
      ...imported
    ];
  }

  normalizeMemoBoxes();
  memoBoxActiveIndex = 0;
  saveMemoBoxes();
  showMemoBox();

  const failureText = failures.length
    ? `\n失敗: ${failures.length}件`
    : "";

  alert(
    `Memo Import完了: ${imported.length}件${failureText}`
  );

  if (failures.length) {
    console.warn("Memo import failures", failures);
  }

  event.target.value = "";

}

function inferMemoMode(item = {}) {

  if (item.memoMode) {
    return item.memoMode;
  }

  const type =
    String(item.knowledgeType || item.type || "").toLowerCase();

  const sourceFormat =
    String(item.sourceFormat || "").toLowerCase();

  if (sourceFormat && sourceFormat !== "json") {
    return "document";
  }

  if (
    [
      "specification",
      "architecture",
      "design",
      "core",
      "rule",
      "implementation"
    ].includes(type)
  ) {
    return "knowledge";
  }

  return "simple";

}

function normalizeMemoBoxes() {

  memoBoxList =
    (memoBoxList || []).map(item => ({

      /* ==========================
         Basic
      ========================== */

      memoMode:
        inferMemoMode(item),

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
        item.updatedAt || "",

      sourceFileName:
        item.sourceFileName || "",

      sourceFormat:
        item.sourceFormat || "",

      importedAt:
        item.importedAt || ""

    }));

}

function filterMemoBoxes() {

  const keyword =
    memoBoxSearch
      .trim()
      .toLowerCase();

  return memoBoxList.filter(item => {

    if (
      memoBoxModeFilter &&
      item.memoMode !== memoBoxModeFilter
    ) {
      return false;
    }

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
      item.memoMode,
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
        !getMemoMetadataTitle(metadata)
      ) {
         return memo;
      }

      return {
        ...memo,

        id:
          metadata.id || memo.id || "",

        name:
          getMemoMetadataTitle(metadata) ||
          memo.name ||
          "メモ",

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
            ? normalizeMemoArrayValue(metadata.keywords)
            : memo.keywords || [],

        relationships:
          metadata.relationships?.length
            ? normalizeMemoArrayValue(metadata.relationships)
            : memo.relationships || [],

        updatedAt:
          new Date().toISOString()

      };

    });

  saveMemoBoxes();
  showMemoBox();

  alert("Metadata更新完了");

}



function repairSuspiciousMemoTitles() {

  normalizeMemoBoxes();

  let repaired = 0;

  memoBoxList.forEach(item => {

    if (
      isSuspiciousMemoTitle(item.name)
    ) {

      const next =
        getSafeMemoTitleCandidate(item);

      if (
        next &&
        next !== "メモ" &&
        !isSuspiciousMemoTitle(next)
      ) {
        item.name = next;
        item.updatedAt =
          new Date().toISOString();
        repaired++;
      }

    }

  });

  if (repaired > 0) {
    saveMemoBoxes();
    showMemoBox();
  }

  alert(
    repaired > 0
      ? `${repaired}件の題名を修復しました。`
      : "修復対象はありませんでした。"
  );
}

function isSuspiciousMemoTitle(value) {

  const text =
    String(value || "").trim();

  if (!text) {
    return false;
  }

  const metadataLabels = [
    "Title:",
    "Summary:",
    "Series:",
    "KnowledgeType:",
    "Category:",
    "Status:",
    "Priority:",
    "Stability:",
    "DecisionLevel:",
    "Version:",
    "Owner:",
    "Authority:",
    "Created:",
    "Updated:",
    "Tags:",
    "Keywords:",
    "Relationships:",
    "DependsOn:",
    "Provides:",
    "Input:",
    "Output:",
    "Workflow:",
    "Rules:"
  ];

  const hits =
    metadataLabels.filter(label =>
      text.includes(label)
    ).length;

  return (
    text.length > 220 ||
    hits >= 4
  );

}

function getSafeMemoTitleCandidate(item) {

  const sourceFileName =
    String(item?.sourceFileName || "").trim();

  if (sourceFileName) {
    return sourceFileName.replace(/\.[^.]+$/, "") || sourceFileName;
  }

  const ignoredPatterns = [
    /^={3,}$/,
    /^-{3,}$/,
    /^(Metadata|Body|Purpose|Scope|Definitions|Background|Architecture|Workflow|Design|Specification|Rules|Implementation Notes|Examples|Validation|Migration|Compatibility|Limitations|Future|References|Related Documents|Completion Criteria|Revision History)\s*[:：]?$/i,
    /^(ID|Title|Summary|Series|KnowledgeType|Category|Status|Priority|Stability|DecisionLevel|Version|Owner|Authority|Created|Updated|Tags|Keywords|Relationships|DependsOn|Provides|Input|Output|Workflow|Rules|Compatibility|Supersedes|SupersededBy|MergedFrom|MergedInto|DecisionRecord)\s*[:：]/i
  ];

  const lines =
    String(item?.text || "")
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

  for (const line of lines) {

    if (ignoredPatterns.some(pattern => pattern.test(line))) {
      continue;
    }

    if (isSuspiciousMemoTitle(line)) {
      continue;
    }

    if (line.length > 100) {
      continue;
    }

    return line;
  }

  return "メモ";
}

function getMemoDisplayName(item) {

  const name =
    String(item?.name || "").trim();

  if (
    name &&
    !isSuspiciousMemoTitle(name)
  ) {
    return name;
  }

  return getSafeMemoTitleCandidate(item);
}

function sanitizeMemoParsedMetadata(metadata) {

  const safe =
    metadata &&
    typeof metadata === "object"
      ? { ...metadata }
      : {};

  const title =
    getMemoMetadataTitle(safe);

  if (isSuspiciousMemoTitle(title)) {
    delete safe.title;
    delete safe.name;
  }

  return safe;
}

function updateMemoEditorModeVisibility() {

  const mode =
    get("memoBoxMode")?.value || "simple";

  const identity =
    get("memoKnowledgeIdentityFields");

  const metadata =
    get("memoKnowledgeMetadataFields");

  const isKnowledge =
    mode === "knowledge";

  if (identity) {
    identity.style.display =
      isKnowledge ? "" : "none";
  }

  if (metadata) {
    metadata.style.display =
      isKnowledge ? "" : "none";
  }

  if (!isKnowledge) {
    window.memoBoxParsedMetadata = {};
  }
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

/* ===============================
   Toggle Memo Lock
=============================== */

function toggleMemoLock(index = null) {

  if (
    index === null ||
    index === undefined
  ) {
    index =
      Number(
        get("memoEditorIndex")?.value
      );
  }

  if (
    Number.isNaN(index) ||
    index < 0 ||
    index >= memoBoxList.length
  ) {
    return;
  }

  const memo =
    memoBoxList[index];

  if (memo.migrationLocked === true) {
    alert("Migration Lock中のため変更できません。");
    return;
  }

  memo.locked =
    !memo.locked;

  memo.updatedAt =
    new Date().toISOString();

  saveMemoBoxes();

  showMemoBox();

}

function normalizeMemoArrayValue(value) {

  if (Array.isArray(value)) {
    return value
      .map(v => String(v).trim())
      .filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map(v => v.trim())
    .filter(Boolean);

}

function getMemoMetadataTitle(metadata) {

  return (
    metadata.title ||
    metadata.name ||
    ""
  );

}

function getMemoMetadataCreated(metadata) {

  return (
    metadata.createdAt ||
    metadata.created ||
    ""
  );

}

function sanitizeMemoExportFileName(
  name
) {

  return String(name || "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_");

}

function getSelectedMemoBoxes() {

  return [...memoBoxSelected]
    .sort((a, b) => a - b)
    .map(index =>
      memoBoxList[index]
    )
    .filter(Boolean);

}

function exportSelectedMemoBoxes() {

  saveMemoBoxCurrent();

  const selected =
    getSelectedMemoBoxes();

  if (!selected.length) {
    alert(
      "エクスポートするメモを選択してください"
    );
    return;
  }

  const defaultName =
    "memo_boxes_selected";

  const inputName =
    prompt(
      "エクスポート名を入力してください",
      defaultName
    );

  if (inputName === null) {
    return;
  }

  const safeName =
    sanitizeMemoExportFileName(
      inputName
    );

  if (!safeName) {
    alert(
      "ファイル名を入力してください"
    );
    return;
  }

  downloadJsonFile(
    selected,
    safeName + ".json"
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

window.inferMemoMode = inferMemoMode;

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

window.readMemoMetadataFromBody =
  readMemoMetadataFromBody;

window.selectMemoTitle = selectMemoTitle;

window.deleteMemoBox = deleteMemoBox;

window.selectAllMemoBoxes = selectAllMemoBoxes;

window.clearMemoSelection = 
clearMemoSelection;

window.lockSelectedMemoBoxes =
lockSelectedMemoBoxes;

window.unlockSelectedMemoBoxes =
unlockSelectedMemoBoxes;

window.deleteSelectedMemoBoxes = deleteSelectedMemoBoxes;

window.toggleMemoSelection = toggleMemoSelection;

window.copyMemoBox = copyMemoBox;

window.copyMemoTitleList =
  copyMemoTitleList;

window.refreshMemoMetadataFromText =
  refreshMemoMetadataFromText;

window.toggleMemoLock =
  toggleMemoLock;

/* ==========================================================
   Memo Box v1.5 Completion Layer
   Priority B / C + Batch Action
========================================================== */

var memoBoxSortKey =
  localStorage.getItem("memoBoxSortKey") || "updated-desc";

var memoBoxLastImportSnapshot = null;
var memoBoxLastImportReport = null;
var memoBoxActiveTab = memoBoxModeFilter || "all";

function normalizeMemoBoxes() {

  memoBoxList = (memoBoxList || []).map(item => ({
    ...item,
    memoMode: inferMemoMode(item),
    boxTitle: item.boxTitle || "",
    id: item.id || "",
    name: item.name || "",
    summary: item.summary || "",
    text: item.text || "",
    knowledgeType: item.knowledgeType || item.type || "Memo",
    category: item.category || "",
    type: item.type || "Idea",
    status: item.status || "Inbox",
    series: item.series || "",
    priority: item.priority || "",
    stability: item.stability || "",
    decisionLevel: item.decisionLevel || "",
    version: item.version || "",
    keywords: Array.isArray(item.keywords) ? item.keywords : [],
    relationships: Array.isArray(item.relationships) ? item.relationships : [],
    locked: item.locked === true,
    migrationLocked: item.migrationLocked === true,
    pinned: item.pinned === true,
    archivedAt: item.archivedAt || "",
    createdAt: item.createdAt || "",
    updatedAt: item.updatedAt || "",
    sourceFileName: item.sourceFileName || "",
    sourceFormat: item.sourceFormat || "",
    importedAt: item.importedAt || ""
  }));
}

function getVisibleMemoBoxes() {
  const rows = filterMemoBoxes().slice();
  const compareText = (a, b, key) =>
    String(a[key] || "").localeCompare(String(b[key] || ""), "ja");
  const compareDate = (a, b, key) =>
    String(a[key] || "").localeCompare(String(b[key] || ""));

  rows.sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    switch (memoBoxSortKey) {
      case "updated-asc": return compareDate(a, b, "updatedAt");
      case "created-desc": return compareDate(b, a, "createdAt");
      case "created-asc": return compareDate(a, b, "createdAt");
      case "name-asc": return compareText(a, b, "name");
      case "name-desc": return compareText(b, a, "name");
      case "status-asc": return compareText(a, b, "status");
      case "version-desc": return compareText(b, a, "version");
      default: return compareDate(b, a, "updatedAt");
    }
  });
  return rows;
}

function setMemoTab(tab) {
  memoBoxActiveTab = tab || "all";
  memoBoxModeFilter = ["knowledge", "simple", "document", "relation"].includes(tab)
    ? tab : "";
  memoBoxStatusFilter = tab === "archive" ? "Archive" : "";
  showMemoBox();
}

function setMemoSort(value) {
  memoBoxSortKey = value || "updated-desc";
  localStorage.setItem("memoBoxSortKey", memoBoxSortKey);
  showMemoBox();
}

function toggleMemoPin(index) {
  const memo = memoBoxList[index];
  if (!memo) return;
  memo.pinned = !memo.pinned;
  memo.updatedAt = new Date().toISOString();
  saveMemoBoxes();
  showMemoBox();
}

function archiveSelectedMemoBoxes() {
  const selected = getSelectedMemoBoxes();
  if (!selected.length) return alert("選択されていません");
  if (!confirm(`${selected.length}件をArchiveへ移動しますか？`)) return;
  let changed = 0;
  selected.forEach(memo => {
    if (memo.migrationLocked === true) return;
    memo.status = "Archive";
    memo.archivedAt = new Date().toISOString();
    memo.updatedAt = memo.archivedAt;
    changed++;
  });
  memoBoxSelected.clear();
  saveMemoBoxes();
  showMemoBox();
  alert(`${changed}件をArchiveへ移動しました。`);
}

function duplicateSelectedMemoBoxes() {
  const selected = getSelectedMemoBoxes();
  if (!selected.length) return alert("選択されていません");
  const now = new Date().toISOString();
  const copies = selected.map(memo => ({
    ...JSON.parse(JSON.stringify(memo)),
    id: "",
    name: `${memo.name || "メモ"} コピー`,
    status: "Draft",
    locked: false,
    migrationLocked: false,
    pinned: false,
    createdAt: now,
    updatedAt: now
  }));
  memoBoxList.push(...copies);
  memoBoxSelected.clear();
  saveMemoBoxes();
  showMemoBox();
  alert(`${copies.length}件を複製しました。`);
}

function batchEditSelectedMemoMetadata() {
  const selected = getSelectedMemoBoxes();
  if (!selected.length) return alert("選択されていません");

  const field = prompt(
    "変更項目を入力してください\nstatus / category / memoMode / type / series / priority / version",
    "status"
  );
  if (field === null) return;
  const allowed = ["status", "category", "memoMode", "type", "series", "priority", "version"];
  if (!allowed.includes(field)) return alert("対応していない項目です");

  const value = prompt(`${field} の新しい値を入力してください`, "");
  if (value === null) return;
  if (field === "memoMode" && !MEMO_BOX_MODES.includes(value)) {
    return alert("memoModeは knowledge / simple / document / relation のいずれかです");
  }

  let changed = 0;
  selected.forEach(memo => {
    if (memo.migrationLocked === true) return;
    memo[field] = value;
    if (field === "type") memo.knowledgeType = value;
    memo.updatedAt = new Date().toISOString();
    changed++;
  });
  saveMemoBoxes();
  showMemoBox();
  alert(`${changed}件を更新しました。`);
}

function convertSelectedMemoMode(mode) {
  if (!MEMO_BOX_MODES.includes(mode)) return;
  const selected = getSelectedMemoBoxes();
  if (!selected.length) return alert("選択されていません");
  let changed = 0;
  selected.forEach(memo => {
    if (memo.migrationLocked === true) return;
    memo.memoMode = mode;
    memo.updatedAt = new Date().toISOString();
    changed++;
  });
  saveMemoBoxes();
  showMemoBox();
  alert(`${changed}件を${mode}へ変更しました。`);
}


function mergeSelectedMemoBoxes() {
  const selected = getSelectedMemoBoxes();
  if (selected.length < 2) return alert("Mergeには2件以上選択してください");
  const title = prompt("統合後のタイトル", "統合メモ");
  if (title === null) return;
  const now = new Date().toISOString();
  const merged = {
    memoMode: selected.every(m => m.memoMode === "knowledge") ? "knowledge" : "simple",
    boxTitle: "",
    id: "",
    name: title || "統合メモ",
    summary: `${selected.length}件のメモを統合`,
    text: selected.map((m, i) =>
      `============================================================\nSource ${i + 1}: ${m.id || m.name || "Memo"}\n============================================================\n\n${m.text || ""}`
    ).join("\n\n"),
    knowledgeType: "Memo",
    category: "Merged",
    type: "Memo",
    status: "Draft",
    series: "",
    priority: "",
    stability: "",
    decisionLevel: "",
    version: "1.0",
    keywords: [],
    relationships: selected.map(m => m.id).filter(Boolean),
    locked: false,
    migrationLocked: false,
    pinned: false,
    createdAt: now,
    updatedAt: now,
    mergedFrom: selected.map(m => m.id || m.name).filter(Boolean)
  };
  memoBoxList.push(merged);
  memoBoxSelected.clear();
  saveMemoBoxes();
  showMemoBox();
  alert("統合メモをDraftとして作成しました。元メモは保持しています。");
}

function exportSelectedMemoPackage() {
  const selected = getSelectedMemoBoxes();
  if (!selected.length) return alert("Package化するメモを選択してください");
  const packageName = prompt("Package名", "memo_package");
  if (packageName === null) return;
  const safeName = sanitizeMemoExportFileName(packageName || "memo_package");
  const createdAt = new Date().toISOString();
  const payload = {
    manifest: {
      packageType: "memo-package",
      packageVersion: "1.0",
      name: packageName || "memo_package",
      createdAt,
      itemCount: selected.length
    },
    memos: selected,
    relationships: selected.flatMap(m =>
      (m.relationships || []).map(target => ({ from: m.id || m.name, type: "relatedTo", to: target }))
    )
  };
  downloadJsonFile(payload, `${safeName}.memo-package.json`);
}

function runMemoBatchAction() {
  if (!memoBoxSelected.size) return alert("対象メモを選択してください");
  const action = prompt(
`一括操作を入力してください
1: ロック
2: ロック解除
3: Archive
4: Export
5: Metadata変更
6: Knowledge化
7: Simple化
8: Document化
9: Relation化
10: 複製
11: 削除
12: Merge
13: Package化`, "1");
  if (action === null) return;
  const actions = {
    "1": lockSelectedMemoBoxes,
    "2": unlockSelectedMemoBoxes,
    "3": archiveSelectedMemoBoxes,
    "4": exportSelectedMemoBoxes,
    "5": batchEditSelectedMemoMetadata,
    "6": () => convertSelectedMemoMode("knowledge"),
    "7": () => convertSelectedMemoMode("simple"),
    "8": () => convertSelectedMemoMode("document"),
    "9": () => convertSelectedMemoMode("relation"),
    "10": duplicateSelectedMemoBoxes,
    "11": deleteSelectedMemoBoxes,
    "12": mergeSelectedMemoBoxes,
    "13": exportSelectedMemoPackage
  };
  const fn = actions[String(action).trim()];
  if (!fn) return alert("操作番号が正しくありません");
  fn();
}

function getMemoDuplicateKey(memo) {
  const id = String(memo.id || "").trim();
  if (id) return `id:${id}|v:${String(memo.version || "").trim()}`;
  const source = String(memo.sourceFileName || "").trim();
  if (source) return `file:${source}|name:${String(memo.name || "").trim()}`;
  return `name:${String(memo.name || "").trim()}|text:${String(memo.text || "").slice(0, 160)}`;
}

function analyzeMemoImport(imported) {
  const currentMap = new Map();
  memoBoxList.forEach((memo, index) => currentMap.set(getMemoDuplicateKey(memo), index));
  const counts = { knowledge: 0, simple: 0, document: 0, relation: 0, duplicates: 0 };
  const analyzed = imported.map(memo => {
    const mode = inferMemoMode(memo);
    counts[mode] = (counts[mode] || 0) + 1;
    const key = getMemoDuplicateKey(memo);
    const existingIndex = currentMap.has(key) ? currentMap.get(key) : -1;
    if (existingIndex >= 0) counts.duplicates++;
    return { memo, mode, key, existingIndex };
  });
  return { analyzed, counts };
}

function createImportSnapshot() {
  memoBoxLastImportSnapshot = JSON.stringify(memoBoxList);
  localStorage.setItem("memoBoxLastImportSnapshot", memoBoxLastImportSnapshot);
}

function undoLastMemoImport() {
  const snapshot = memoBoxLastImportSnapshot || localStorage.getItem("memoBoxLastImportSnapshot");
  if (!snapshot) return alert("戻せるImportはありません");
  if (!confirm("直前のImport前状態へ戻しますか？")) return;
  try {
    memoBoxList = JSON.parse(snapshot);
    normalizeMemoBoxes();
    saveMemoBoxes();
    memoBoxLastImportSnapshot = null;
    localStorage.removeItem("memoBoxLastImportSnapshot");
    memoBoxSelected.clear();
    showMemoBox();
    alert("Importを元に戻しました。\nImport後の編集も戻るため注意してください。");
  } catch (error) {
    alert(`Undo失敗: ${error.message || error}`);
  }
}

function showLastMemoImportResult() {
  if (!memoBoxLastImportReport) return alert("Import結果はありません");
  const r = memoBoxLastImportReport;
  alert(
`Import結果
成功: ${r.success}
上書き: ${r.overwritten}
Version追加: ${r.versioned}
スキップ: ${r.skipped}
警告: ${r.warnings.length}
失敗: ${r.failures.length}`
  );
  if (r.warnings.length || r.failures.length) console.warn("Memo Import Report", r);
}

function chooseDuplicateStrategy(count) {
  if (!count) return "new";
  const choice = prompt(
`${count}件の重複候補があります。
重複時の処理を入力してください。
skip: スキップ
overwrite: 上書き
version: Version追加
new: 新規追加`, "skip");
  if (choice === null) return null;
  const normalized = String(choice).trim().toLowerCase();
  return ["skip", "overwrite", "version", "new"].includes(normalized)
    ? normalized : "skip";
}

async function loadMemoBoxesFile(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;

  const imported = [];
  const failures = [];
  for (const file of files) {
    try {
      const result = await readMemoImportFile(file);
      imported.push(...parseMemoImportText(file, result.text));
    } catch (error) {
      failures.push({ fileName: file.name, message: error?.message || String(error) });
    }
  }

  if (!imported.length) {
    event.target.value = "";
    alert(`Importできるデータがありませんでした。\n失敗: ${failures.length}件`);
    return;
  }

  const analysis = analyzeMemoImport(imported);
  const c = analysis.counts;
  const preview =
`Import Preview
ファイル: ${files.length}
合計: ${imported.length}
Knowledge: ${c.knowledge || 0}
Simple: ${c.simple || 0}
Document: ${c.document || 0}
Relation: ${c.relation || 0}
重複候補: ${c.duplicates || 0}
読込失敗: ${failures.length}

実行しますか？`;
  if (!confirm(preview)) {
    event.target.value = "";
    return;
  }

  const mode = window.memoBoxImportMode || "merge";
  const strategy = mode === "replace" ? "new" : chooseDuplicateStrategy(c.duplicates || 0);
  if (strategy === null) {
    event.target.value = "";
    return;
  }

  createImportSnapshot();
  const report = { success: 0, overwritten: 0, versioned: 0, skipped: 0, warnings: [], failures };

  if (mode === "replace") memoBoxList = [];

  analysis.analyzed.forEach(entry => {
    const memo = normalizeImportedMemoItem(entry.memo, {});
    const existingIndex = mode === "replace"
      ? -1
      : memoBoxList.findIndex(current => getMemoDuplicateKey(current) === entry.key);

    if (existingIndex < 0 || strategy === "new") {
      memoBoxList.push(memo);
      report.success++;
      return;
    }
    if (strategy === "skip") {
      report.skipped++;
      return;
    }
    if (strategy === "overwrite") {
      if (isMemoLocked(memoBoxList[existingIndex])) {
        report.warnings.push(`${memo.id || memo.name}: ロック中のためスキップ`);
        report.skipped++;
      } else {
        memoBoxList[existingIndex] = { ...memoBoxList[existingIndex], ...memo, updatedAt: new Date().toISOString() };
        report.overwritten++;
      }
      return;
    }
    if (strategy === "version") {
      const base = String(memo.version || memoBoxList[existingIndex].version || "1.0");
      const match = base.match(/^(\d+)(?:\.(\d+))?/);
      memo.version = match ? `${match[1]}.${Number(match[2] || 0) + 1}` : `${base}.1`;
      memo.status = "Draft";
      memoBoxList.push(memo);
      report.versioned++;
    }
  });

  normalizeMemoBoxes();
  memoBoxActiveIndex = 0;
  memoBoxSelected.clear();
  saveMemoBoxes();
  memoBoxLastImportReport = report;
  event.target.value = "";
  showMemoBox();
  showLastMemoImportResult();
}

function showMemoBox() {
  normalizeMemoBoxes();
  const filtered = getVisibleMemoBoxes();
  const memoCards = filtered.map(item => {
    const index = memoBoxList.indexOf(item);
    return `
<div class="memo-card ${index === memoBoxActiveIndex ? "active" : ""}">
  <div class="memo-card-select">
    <input type="checkbox" ${memoBoxSelected.has(index) ? "checked" : ""}
      onclick="event.stopPropagation()"
      onchange="toggleMemoSelection(${index},this.checked);showMemoBox()">
    <button class="memo-lock-btn" onclick="event.stopPropagation();toggleMemoLock(${index})">
      ${isMemoLocked(item) ? "🔏" : "🖋"}
    </button>
    <button onclick="event.stopPropagation();toggleMemoPin(${index})">
      ${item.pinned ? "📌" : "📍"}
    </button>
  </div>
  <div class="memo-card-body" onclick="selectMemoBox(${index})">
    <div class="memo-card-title">
      ${item.boxTitle ? `<div class="small-muted">${escapeHtml(item.boxTitle)}</div>` : ""}
      ${item.id ? `<div class="small-muted">${escapeHtml(item.id)}</div>` : ""}
      ${item.pinned ? "📌 " : ""}${isMemoLocked(item) ? "🔏 " : "🖋 "}${escapeHtml(getMemoDisplayName(item))}
    </div>
    <div class="memo-card-meta">
      <span>${escapeHtml(item.memoMode || inferMemoMode(item))}</span>
      <span>${escapeHtml(item.status || "-")}</span>
      <span>${escapeHtml(item.category || item.type || "-")}</span>
      ${item.version ? `<span>v${escapeHtml(item.version)}</span>` : ""}
      ${Array.isArray(item.relationships) && item.relationships.length
        ? `<span>🔗${item.relationships.length}</span>`
        : ""}
    </div>
    ${item.summary ? `<div class="small-muted">${escapeHtml(item.summary)}</div>` : ""}
    ${item.updatedAt ? `<div class="small-muted">更新: ${escapeHtml(item.updatedAt)}</div>` : ""}
    ${Array.isArray(item.relationships) && item.relationships.length
      ? `
      <div class="memo-card-links">
        ${item.relationships.map(targetId => `
          <button
            class="memo-link-btn"
            onclick="event.stopPropagation();openMemoById('${escapeJs(String(targetId))}')">
            🔗${escapeHtml(String(targetId))}
          </button>
        `).join("")}
      </div>
      `
      : ""}
  </div>
  <div class="memo-card-actions">
    <button onclick="openMemoEditor(${index})">${isMemoLocked(item) ? "🔏表示" : "🖋編集"}</button>
    <button onclick="event.stopPropagation();copyMemoBoxByIndex(${index})">📋コピー</button>
  </div>
</div>`;
  }).join("");

  const tab = (key, label) =>
    `<button ${memoBoxActiveTab === key ? 'style="font-weight:bold"' : ""} onclick="setMemoTab('${key}')">${label}</button>`;

  openFloatPanel("MEMO BOX", `
<div class="memo-actions">
<button onclick="openMemoEditor()">＋新規</button>
<button onclick="saveMemoBoxes()">💾保存</button>
<button onclick="selectAllMemoBoxes()">☑All</button>
<button onclick="clearMemoSelection()">☐Clear</button>
<button onclick="runMemoBatchAction()">一括操作 (${memoBoxSelected.size})</button>
<button onclick="importMemoBoxes('merge')">追加Import</button>
<button onclick="importMemoBoxes('replace')">全置換Import</button>
<button onclick="undoLastMemoImport()">↶ Import Undo</button>
<button onclick="showLastMemoImportResult()">Import結果</button>
<button onclick="exportMemoBoxes()">全Export</button>
</div>
<div class="memo-actions">
${tab("all", "All")}${tab("knowledge", "Knowledge")}${tab("simple", "Simple")}${tab("document", "Document")}${tab("relation", "Relation")}${tab("archive", "Archive")}
</div>
<hr>
<details open><summary>Filter / Search / Sort</summary>
<div class="memo-filter">
<input id="memoSearch" class="input" placeholder="Title / 本文 / ID / Keywords / Summary" value="${escapeHtml(memoBoxSearch)}"
 oninput="memoBoxSearch=this.value;showMemoBox()">
<select onchange="setMemoSort(this.value)">
<option value="updated-desc" ${memoBoxSortKey === "updated-desc" ? "selected" : ""}>更新日 新しい順</option>
<option value="updated-asc" ${memoBoxSortKey === "updated-asc" ? "selected" : ""}>更新日 古い順</option>
<option value="created-desc" ${memoBoxSortKey === "created-desc" ? "selected" : ""}>作成日 新しい順</option>
<option value="created-asc" ${memoBoxSortKey === "created-asc" ? "selected" : ""}>作成日 古い順</option>
<option value="name-asc" ${memoBoxSortKey === "name-asc" ? "selected" : ""}>名前 昇順</option>
<option value="name-desc" ${memoBoxSortKey === "name-desc" ? "selected" : ""}>名前 降順</option>
<option value="status-asc" ${memoBoxSortKey === "status-asc" ? "selected" : ""}>Status</option>
<option value="version-desc" ${memoBoxSortKey === "version-desc" ? "selected" : ""}>Version</option>
</select>
<select onchange="memoBoxStatusFilter=this.value;memoBoxActiveTab='all';showMemoBox()">
<option value="">Status: All</option>
${MEMO_BOX_STATUSES.map(v => `<option value="${v}" ${memoBoxStatusFilter === v ? "selected" : ""}>${v}</option>`).join("")}
</select>
<select onchange="memoBoxTypeFilter=this.value;showMemoBox()">
<option value="">Type: All</option>
${MEMO_BOX_TYPES.map(v => `<option value="${v}" ${memoBoxTypeFilter === v ? "selected" : ""}>${v}</option>`).join("")}
</select>
</div></details>
<div class="small-muted">表示 ${filtered.length} / 全 ${memoBoxList.length}件　選択 ${memoBoxSelected.size}件</div>
<div class="memo-list">${memoCards || '<div class="small-muted">該当メモなし</div>'}</div>
<input id="memoBoxImportFile" type="file" accept=".json,.md,.markdown,.txt,.html,.htm,.csv,.tsv" multiple style="display:none" onchange="loadMemoBoxesFile(event)">
`);
}

window.setMemoTab = setMemoTab;
window.setMemoSort = setMemoSort;
window.toggleMemoPin = toggleMemoPin;
window.runMemoBatchAction = runMemoBatchAction;
window.archiveSelectedMemoBoxes = archiveSelectedMemoBoxes;
window.batchEditSelectedMemoMetadata = batchEditSelectedMemoMetadata;
window.convertSelectedMemoMode = convertSelectedMemoMode;
window.duplicateSelectedMemoBoxes = duplicateSelectedMemoBoxes;
window.mergeSelectedMemoBoxes = mergeSelectedMemoBoxes;
window.exportSelectedMemoPackage = exportSelectedMemoPackage;
window.undoLastMemoImport = undoLastMemoImport;
window.showLastMemoImportResult = showLastMemoImportResult;
window.loadMemoBoxesFile = loadMemoBoxesFile;
window.showMemoBox = showMemoBox;

window.openMemoById = openMemoById;



/* ============================================================
   Memo Box v1.9 LTS RC Extension
   Health / Repair / Dashboard / Recent / Working / Folder / ZIP
============================================================ */

const MEMO_BOX_LTS_VERSION = "1.9.0-rc1";
const MEMO_BOX_RECENT_KEY = "AI_PROMPT_OS_MEMO_RECENT_V1";
const MEMO_BOX_BACKUP_KEY = "AI_PROMPT_OS_MEMO_AUTO_BACKUP_V1";
const MEMO_BOX_RECENT_LIMIT = 8;

let memoBoxDashboardVisible = true;

function getMemoRecentIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MEMO_BOX_RECENT_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function rememberMemoOpened(item) {
  if (!item) return;
  const key = String(item.id || item.name || "").trim();
  if (!key) return;
  const list = getMemoRecentIds().filter(v => v !== key);
  list.unshift(key);
  localStorage.setItem(
    MEMO_BOX_RECENT_KEY,
    JSON.stringify(list.slice(0, MEMO_BOX_RECENT_LIMIT))
  );
}

function getRecentMemoItems() {
  const keys = getMemoRecentIds();
  return keys
    .map(key => memoBoxList.find(item =>
      String(item.id || "") === key ||
      String(item.name || "") === key
    ))
    .filter(Boolean);
}

function createMemoAutoBackup(reason = "manual") {
  try {
    const payload = {
      version: MEMO_BOX_LTS_VERSION,
      reason,
      createdAt: new Date().toISOString(),
      activeIndex: memoBoxActiveIndex,
      memos: JSON.parse(JSON.stringify(memoBoxList))
    };
    localStorage.setItem(MEMO_BOX_BACKUP_KEY, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.warn("Memo auto backup failed", error);
    return false;
  }
}

function restoreMemoAutoBackup() {
  let payload;
  try {
    payload = JSON.parse(localStorage.getItem(MEMO_BOX_BACKUP_KEY) || "null");
  } catch (_) {
    payload = null;
  }
  if (!payload || !Array.isArray(payload.memos)) {
    alert("復元できるAuto Backupがありません。");
    return;
  }
  if (!confirm(`${payload.createdAt || ""} のBackupへ戻しますか？`)) return;
  memoBoxList = JSON.parse(JSON.stringify(payload.memos));
  memoBoxActiveIndex = Number.isInteger(payload.activeIndex) ? payload.activeIndex : 0;
  memoBoxSelected.clear();
  normalizeMemoBoxes();
  saveMemoBoxes();
  showMemoBox();
}

function countCodeSignals(value) {
  const text = String(value || "");
  const patterns = [
    /\bfunction\b/g, /\bconst\b/g, /\blet\b/g, /\bvar\b/g,
    /onclick\s*=/g, /<\/?[a-z][^>]*>/gi, /=>/g, /\{[\s\S]*\}/g
  ];
  return patterns.reduce((total, pattern) => {
    const matches = text.match(pattern);
    return total + (matches ? matches.length : 0);
  }, 0);
}

function inspectMemoHealth(item) {
  const issues = [];
  const mode = item.memoMode || inferMemoMode(item);
  const title = String(item.name || "").trim();
  const summary = String(item.summary || "").trim();
  const status = String(item.status || "").trim();

  if (!title) {
    issues.push({ code: "TITLE_MISSING", severity: "warning", label: "題名が未設定" });
  } else if (isSuspiciousMemoTitle(title)) {
    issues.push({ code: "TITLE_SUSPICIOUS", severity: "error", label: "題名がMetadataまたは長文を誤認識" });
  }

  if (summary.length > 500) {
    issues.push({ code: "SUMMARY_TOO_LONG", severity: "warning", label: `Summaryが長すぎる (${summary.length}文字)` });
  }
  if (summary && countCodeSignals(summary) >= 4) {
    issues.push({ code: "SUMMARY_CODE", severity: "warning", label: "Summaryへコード断片が混入" });
  }

  if (!status) {
    issues.push({ code: "STATUS_MISSING", severity: "warning", label: "Statusが未設定" });
  }

  if (mode === "knowledge") {
    if (!String(item.id || "").trim()) {
      issues.push({ code: "KNOWLEDGE_ID_MISSING", severity: "warning", label: "Knowledge IDが未設定" });
    }
    if (!String(item.version || "").trim()) {
      issues.push({ code: "KNOWLEDGE_VERSION_MISSING", severity: "info", label: "Versionが未設定" });
    }
  }

  if (mode !== "knowledge") {
    const hasKnowledgeFields = Boolean(
      String(item.boxTitle || "").trim() ||
      String(item.decisionLevel || "").trim() ||
      String(item.stability || "").trim()
    );
    if (hasKnowledgeFields) {
      issues.push({ code: "NON_KNOWLEDGE_METADATA", severity: "info", label: "Simple/DocumentにKnowledge Metadataが残存" });
    }
  }

  if (Array.isArray(item.relationships)) {
    const missingTargets = item.relationships.filter(target =>
      !memoBoxList.some(memo => String(memo.id || "") === String(target))
    );
    if (missingTargets.length) {
      issues.push({
        code: "RELATIONSHIP_TARGET_MISSING",
        severity: "warning",
        label: `Relationship参照先なし (${missingTargets.length}件)`
      });
    }
  }

  const deduction = issues.reduce((score, issue) => {
    if (issue.severity === "error") return score + 30;
    if (issue.severity === "warning") return score + 12;
    return score + 4;
  }, 0);

  return {
    score: Math.max(0, 100 - deduction),
    issues,
    status:
      issues.some(v => v.severity === "error") ? "error" :
      issues.some(v => v.severity === "warning") ? "warning" : "healthy"
  };
}

function buildSafeSummary(item) {
  const text = String(item.text || "");
  const purposeMatch = text.match(
    /(?:^|\n)\s*(?:\d+\.\s*)?Purpose\s*[:：]?\s*(?:\n[-=]+\n|\n)([\s\S]*?)(?=\n={5,}|\n-{5,}|\n[A-Z][A-Za-z ]+\s*[:：]?\n|\Z)/i
  );
  const source = purposeMatch ? purposeMatch[1] : text;
  const lines = source
    .split(/\r?\n/)
    .map(v => v.trim())
    .filter(v => v)
    .filter(v => !/^[=\-]{3,}$/.test(v))
    .filter(v => !/^(ID|Title|Summary|Series|KnowledgeType|Category|Status|Priority|Version|Relationships|DependsOn|Provides|Input|Output)\s*[:：]/i.test(v))
    .filter(v => countCodeSignals(v) === 0);

  let summary = "";
  for (const line of lines) {
    if ((summary + " " + line).length > 180) break;
    summary += (summary ? " " : "") + line;
    if (summary.length >= 80) break;
  }
  return summary || getSafeMemoTitleCandidate(item);
}

function buildMemoRepairPlan(item, index) {
  const health = inspectMemoHealth(item);
  const changes = [];

  health.issues.forEach(issue => {
    if (issue.code === "TITLE_MISSING" || issue.code === "TITLE_SUSPICIOUS") {
      const next = getSafeMemoTitleCandidate(item);
      if (next && next !== "メモ" && next !== item.name) {
        changes.push({ field: "name", from: item.name || "", to: next, reason: issue.label });
      }
    }
    if (issue.code === "SUMMARY_TOO_LONG" || issue.code === "SUMMARY_CODE") {
      const next = buildSafeSummary(item);
      if (next && next !== item.summary) {
        changes.push({ field: "summary", from: item.summary || "", to: next, reason: issue.label });
      }
    }
    if (issue.code === "STATUS_MISSING") {
      changes.push({ field: "status", from: item.status || "", to: "Inbox", reason: issue.label });
    }
  });

  return { index, id: item.id || "", name: item.name || "", changes, health };
}

function getMemoRepairPlans(scope = "all") {
  const indexes = scope === "selected" && memoBoxSelected.size
    ? [...memoBoxSelected]
    : memoBoxList.map((_, index) => index);

  return indexes
    .map(index => buildMemoRepairPlan(memoBoxList[index], index))
    .filter(plan => plan.changes.length);
}

function showMemoHealthReport() {
  normalizeMemoBoxes();
  const results = memoBoxList.map((item, index) => ({
    index,
    item,
    health: inspectMemoHealth(item)
  }));
  const healthy = results.filter(v => v.health.status === "healthy").length;
  const warnings = results.filter(v => v.health.status === "warning").length;
  const errors = results.filter(v => v.health.status === "error").length;
  const average = results.length
    ? Math.round(results.reduce((s, v) => s + v.health.score, 0) / results.length)
    : 100;

  const details = results
    .filter(v => v.health.issues.length)
    .slice(0, 100)
    .map(v => `
      <div class="memo-health-item">
        <b>${escapeHtml(v.item.id || v.item.name || `Memo ${v.index + 1}`)}</b>
        <span>${v.health.status === "error" ? "🔴" : "🟡"} ${v.health.score}</span>
        <ul>${v.health.issues.map(i => `<li>${escapeHtml(i.label)}</li>`).join("")}</ul>
        <button onclick="selectMemoBox(${v.index})">開く</button>
      </div>
    `).join("");

  openFloatPanel("Memo Health", `
    <div><b>Health ${average}%</b></div>
    <div>🟢 Healthy ${healthy}　🟡 Warning ${warnings}　🔴 Error ${errors}</div>
    <hr>
    <button onclick="showMemoRepairPreview('all')">全件 Repair Preview</button>
    <button onclick="showMemoRepairPreview('selected')">選択 Repair Preview</button>
    <div>${details || "問題はありません。"}</div>
  `);
}

function showMemoRepairPreview(scope = "all") {
  const plans = getMemoRepairPlans(scope);
  if (!plans.length) {
    alert("修復候補はありません。");
    return;
  }

  const preview = plans.slice(0, 100).map(plan => `
    <div class="memo-repair-plan">
      <b>${escapeHtml(plan.id || plan.name || `Memo ${plan.index + 1}`)}</b>
      ${plan.changes.map(change => `
        <div>
          ${escapeHtml(change.field)}:
          <del>${escapeHtml(String(change.from).slice(0, 120))}</del>
          →
          <ins>${escapeHtml(String(change.to).slice(0, 180))}</ins>
        </div>
      `).join("")}
    </div>
  `).join("");

  window.memoPendingRepairPlans = plans;
  openFloatPanel("Repair Preview", `
    <div>${plans.length}件を修復予定です。本文は変更しません。</div>
    <button onclick="applyMemoRepairPlans()">修復実行</button>
    <button onclick="window.memoPendingRepairPlans=[];showMemoBox()">キャンセル</button>
    <hr>
    ${preview}
  `);
}

function applyMemoRepairPlans() {
  const plans = Array.isArray(window.memoPendingRepairPlans)
    ? window.memoPendingRepairPlans
    : [];
  if (!plans.length) {
    alert("修復対象がありません。");
    return;
  }
  if (!confirm(`${plans.length}件を修復しますか？`)) return;

  createMemoAutoBackup("before-repair");
  let changed = 0;
  plans.forEach(plan => {
    const item = memoBoxList[plan.index];
    if (!item || isMemoLocked(item)) return;
    plan.changes.forEach(change => {
      item[change.field] = change.to;
      changed++;
    });
    item.updatedAt = new Date().toISOString();
  });

  window.memoPendingRepairPlans = [];
  saveMemoBoxes();
  alert(`${changed}項目を修復しました。`);
  showMemoBox();
}

function toggleMemoWorking(index) {
  const item = memoBoxList[index];
  if (!item || isMemoLocked(item)) return;
  item.working = !item.working;
  item.updatedAt = new Date().toISOString();
  saveMemoBoxes();
  showMemoBox();
}

function getMemoStatistics() {
  const stats = {
    total: memoBoxList.length,
    knowledge: 0, simple: 0, document: 0, relation: 0,
    archive: 0, favorite: 0, working: 0,
    healthy: 0, warning: 0, error: 0,
    repairCandidates: 0
  };

  memoBoxList.forEach((item, index) => {
    const mode = item.memoMode || inferMemoMode(item);
    if (stats[mode] !== undefined) stats[mode]++;
    if (item.archivedAt || item.status === "Archived") stats.archive++;
    if (item.pinned) stats.favorite++;
    if (item.working) stats.working++;
    const health = inspectMemoHealth(item);
    stats[health.status]++;
    if (buildMemoRepairPlan(item, index).changes.length) stats.repairCandidates++;
  });
  return stats;
}

function buildMemoDashboardHtml() {
  const s = getMemoStatistics();
  const recent = getRecentMemoItems();
  return `
  <div class="memo-dashboard">
    <div class="memo-dashboard-grid">
      <button onclick="setMemoTab('knowledge')">Knowledge<br><b>${s.knowledge}</b></button>
      <button onclick="setMemoTab('simple')">Simple<br><b>${s.simple}</b></button>
      <button onclick="setMemoTab('document')">Document<br><b>${s.document}</b></button>
      <button onclick="setMemoTab('relation')">Relation<br><b>${s.relation}</b></button>
      <button onclick="setMemoTab('archive')">Archive<br><b>${s.archive}</b></button>
      <button onclick="memoBoxActiveTab='all';memoBoxSearch='';showMemoBox()">All<br><b>${s.total}</b></button>
    </div>
    <div class="memo-dashboard-row">
      <button onclick="showMemoHealthReport()">Health<br>🟢${s.healthy} 🟡${s.warning} 🔴${s.error}</button>
      <button onclick="showMemoRepairPreview('all')">Repair候補<br><b>${s.repairCandidates}</b></button>
      <button onclick="memoBoxActiveTab='all';memoBoxSearch='';memoBoxStatusFilter='';window.memoWorkingOnly=true;showMemoBox()">Working<br><b>${s.working}</b></button>
      <button onclick="memoBoxActiveTab='all';window.memoFavoriteOnly=true;showMemoBox()">Favorite<br><b>${s.favorite}</b></button>
    </div>
    <details>
      <summary>最近開いたメモ</summary>
      <div>
        ${recent.length ? recent.map(item => `
          <button onclick="openMemoById('${escapeJs(String(item.id || item.name || ""))}')">
            ${escapeHtml(item.id || item.name || "メモ")}
          </button>
        `).join("") : '<span class="small-muted">履歴なし</span>'}
      </div>
    </details>
  </div>`;
}

function selectMemoFolderImport() {
  let input = get("memoBoxFolderImport");
  if (!input) {
    input = document.createElement("input");
    input.id = "memoBoxFolderImport";
    input.type = "file";
    input.multiple = true;
    input.setAttribute("webkitdirectory", "");
    input.style.display = "none";
    input.onchange = loadMemoFolderFiles;
    document.body.appendChild(input);
  }
  input.value = "";
  input.click();
}

async function loadMemoFolderFiles(event) {
  const files = [...(event.target.files || [])];
  if (!files.length) return;
  createMemoAutoBackup("before-folder-import");

  const imported = [];
  const failures = [];
  for (const file of files) {
    try {
      const result = await readMemoImportFile(file);
      const memos = parseMemoImportText(file, result.text);
      memos.forEach(memo => {
        memo.sourceRelativePath = file.webkitRelativePath || file.name;
        memo.sourceFolderPath = (file.webkitRelativePath || "").split("/").slice(0, -1).join("/");
      });
      imported.push(...memos);
    } catch (error) {
      failures.push(`${file.name}: ${error?.message || error}`);
    }
  }

  await commitExternalMemoImport(imported, failures, "Folder");
  event.target.value = "";
}

async function decompressZipDeflate(data) {
  if (typeof DecompressionStream !== "function") {
    throw new Error("このブラウザはZIP展開に必要なDecompressionStreamへ未対応です。");
  }
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function findZipEndOfCentralDirectory(bytes) {
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (bytes[i] === 0x50 && bytes[i+1] === 0x4b && bytes[i+2] === 0x05 && bytes[i+3] === 0x06) {
      return i;
    }
  }
  return -1;
}

async function readZipEntries(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findZipEndOfCentralDirectory(bytes);
  if (eocd < 0) throw new Error("ZIP中央ディレクトリが見つかりません。");

  const entryCount = view.getUint16(eocd + 10, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  let offset = centralOffset;
  const decoder = new TextDecoder("utf-8");
  const results = [];

  for (let i = 0; i < entryCount; i++) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("ZIP Entryが不正です。");
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const fileName = decoder.decode(bytes.slice(offset + 46, offset + 46 + fileNameLength));

    offset += 46 + fileNameLength + extraLength + commentLength;
    if (fileName.endsWith("/")) continue;

    if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error("ZIP Local Headerが不正です。");
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataOffset, dataOffset + compressedSize);

    let data;
    if (method === 0) data = compressed;
    else if (method === 8) data = await decompressZipDeflate(compressed);
    else continue;

    results.push({ fileName, data });
  }
  return results;
}

function selectMemoZipImport() {
  let input = get("memoBoxZipImport");
  if (!input) {
    input = document.createElement("input");
    input.id = "memoBoxZipImport";
    input.type = "file";
    input.accept = ".zip";
    input.style.display = "none";
    input.onchange = loadMemoZipFile;
    document.body.appendChild(input);
  }
  input.value = "";
  input.click();
}

async function loadMemoZipFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  createMemoAutoBackup("before-zip-import");

  const imported = [];
  const failures = [];
  try {
    const entries = await readZipEntries(file);
    for (const entry of entries) {
      const extension = entry.fileName.split(".").pop().toLowerCase();
      if (!["json","md","markdown","txt","html","htm","csv","tsv"].includes(extension)) continue;
      try {
        const text = new TextDecoder("utf-8").decode(entry.data);
        const pseudoFile = { name: entry.fileName };
        const memos = parseMemoImportText(pseudoFile, text);
        memos.forEach(memo => {
          memo.sourceRelativePath = entry.fileName;
          memo.sourcePackageName = file.name;
        });
        imported.push(...memos);
      } catch (error) {
        failures.push(`${entry.fileName}: ${error?.message || error}`);
      }
    }
  } catch (error) {
    failures.push(`${file.name}: ${error?.message || error}`);
  }

  await commitExternalMemoImport(imported, failures, "ZIP");
  event.target.value = "";
}

async function commitExternalMemoImport(imported, failures = [], sourceLabel = "Import") {
  if (!imported.length) {
    alert(`${sourceLabel}でImport可能なデータがありません。\n失敗 ${failures.length}件`);
    return;
  }

  const analysis = analyzeMemoImport(imported);
  const c = analysis.counts;
  const message =
`${sourceLabel} Preview
合計 ${imported.length}
Knowledge ${c.knowledge || 0}
Simple ${c.simple || 0}
Document ${c.document || 0}
Relation ${c.relation || 0}
重複候補 ${c.duplicates || 0}
失敗 ${failures.length}

追加Importしますか？`;

  if (!confirm(message)) return;
  const strategy = chooseDuplicateStrategy(c.duplicates || 0);
  if (strategy === null) return;

  createImportSnapshot();
  const report = { success: 0, overwritten: 0, versioned: 0, skipped: 0, warnings: [], failures: failures.map(message => ({ message })) };

  analysis.analyzed.forEach(entry => {
    const memo = normalizeImportedMemoItem(entry.memo, {});
    const existingIndex = memoBoxList.findIndex(current => getMemoDuplicateKey(current) === entry.key);
    if (existingIndex < 0 || strategy === "new") {
      memoBoxList.push(memo); report.success++; return;
    }
    if (strategy === "skip") { report.skipped++; return; }
    if (strategy === "overwrite") {
      if (isMemoLocked(memoBoxList[existingIndex])) {
        report.warnings.push(`${memo.id || memo.name}: ロック中`);
        report.skipped++;
      } else {
        memoBoxList[existingIndex] = { ...memoBoxList[existingIndex], ...memo, updatedAt: new Date().toISOString() };
        report.overwritten++;
      }
      return;
    }
    if (strategy === "version") {
      memo.version = `${memo.version || "1.0"}.1`;
      memo.status = "Draft";
      memoBoxList.push(memo);
      report.versioned++;
    }
  });

  normalizeMemoBoxes();
  saveMemoBoxes();
  memoBoxLastImportReport = report;
  showMemoBox();
  showLastMemoImportResult();
}

/* existing function wrappers */
const memoBoxOriginalSelectMemoBoxV19 =
  typeof selectMemoBox === "function" ? selectMemoBox : null;

if (memoBoxOriginalSelectMemoBoxV19) {
  selectMemoBox = function(index) {
    const result = memoBoxOriginalSelectMemoBoxV19(index);
    rememberMemoOpened(memoBoxList[index]);
    return result;
  };
}

const memoBoxOriginalOpenMemoByIdV19 =
  typeof openMemoById === "function" ? openMemoById : null;

if (memoBoxOriginalOpenMemoByIdV19) {
  openMemoById = function(id) {
    const result = memoBoxOriginalOpenMemoByIdV19(id);
    const item = memoBoxList.find(memo =>
      String(memo.id || "") === String(id) ||
      String(memo.name || "") === String(id)
    );
    rememberMemoOpened(item);
    return result;
  };
}

const memoBoxOriginalLoadMemoBoxesFileV19 =
  typeof loadMemoBoxesFile === "function" ? loadMemoBoxesFile : null;

if (memoBoxOriginalLoadMemoBoxesFileV19) {
  loadMemoBoxesFile = async function(event) {
    createMemoAutoBackup("before-import");
    return await memoBoxOriginalLoadMemoBoxesFileV19(event);
  };
}

function getVisibleMemoBoxesV19() {
  let list = getVisibleMemoBoxes();
  if (window.memoWorkingOnly) {
    list = list.filter(item => item.working);
  }
  if (window.memoFavoriteOnly) {
    list = list.filter(item => item.pinned);
  }
  return list;
}

function clearMemoQuickViewFilters() {
  window.memoWorkingOnly = false;
  window.memoFavoriteOnly = false;
  memoBoxActiveTab = "all";
  showMemoBox();
}

function showMemoBoxV19() {
  normalizeMemoBoxes();
  const filtered = getVisibleMemoBoxesV19();
  const memoCards = filtered.map(item => {
    const index = memoBoxList.indexOf(item);
    const health = inspectMemoHealth(item);
    const healthIcon = health.status === "error" ? "🔴" : health.status === "warning" ? "🟡" : "🟢";
    return `
<div class="memo-card ${index === memoBoxActiveIndex ? "active" : ""}">
  <div class="memo-card-select">
    <input type="checkbox" ${memoBoxSelected.has(index) ? "checked" : ""}
      onclick="event.stopPropagation()"
      onchange="toggleMemoSelection(${index},this.checked);showMemoBox()">
    <button class="memo-lock-btn" onclick="event.stopPropagation();toggleMemoLock(${index})">
      ${isMemoLocked(item) ? "🔏" : "🖋"}
    </button>
    <button onclick="event.stopPropagation();toggleMemoPin(${index})">
      ${item.pinned ? "⭐" : "☆"}
    </button>
    <button onclick="event.stopPropagation();toggleMemoWorking(${index})">
      ${item.working ? "🛠" : "⚪"}
    </button>
  </div>
  <div class="memo-card-body" onclick="selectMemoBox(${index})">
    <div class="memo-card-title">
      ${item.boxTitle ? `<div class="small-muted">${escapeHtml(item.boxTitle)}</div>` : ""}
      ${item.id ? `<div class="small-muted">${escapeHtml(item.id)}</div>` : ""}
      ${item.pinned ? "⭐ " : ""}${item.working ? "🛠 " : ""}${isMemoLocked(item) ? "🔏 " : ""}${escapeHtml(getMemoDisplayName(item))}
    </div>
    <div class="memo-card-meta">
      <span>${escapeHtml(item.memoMode || inferMemoMode(item))}</span>
      <span>${escapeHtml(item.status || "-")}</span>
      <span>${healthIcon}${health.score}</span>
      ${item.version ? `<span>v${escapeHtml(item.version)}</span>` : ""}
      ${Array.isArray(item.relationships) && item.relationships.length ? `<span>🔗${item.relationships.length}</span>` : ""}
    </div>
    ${item.summary ? `<div class="small-muted">${escapeHtml(item.summary)}</div>` : ""}
    ${item.updatedAt ? `<div class="small-muted">更新: ${escapeHtml(item.updatedAt)}</div>` : ""}
    ${Array.isArray(item.relationships) && item.relationships.length
      ? `<div class="memo-card-links">${item.relationships.map(targetId => `
          <button class="memo-link-btn"
            onclick="event.stopPropagation();openMemoById('${escapeJs(String(targetId))}')">
            🔗${escapeHtml(String(targetId))}
          </button>`).join("")}</div>`
      : ""}
  </div>
  <div class="memo-card-actions">
    <button onclick="openMemoEditor(${index})">${isMemoLocked(item) ? "🔏表示" : "🖋編集"}</button>
    <button onclick="event.stopPropagation();copyMemoBoxByIndex(${index})">📋</button>
  </div>
</div>`;
  }).join("");

  const tab = (key, label) =>
    `<button ${memoBoxActiveTab === key ? 'style="font-weight:bold"' : ""} onclick="window.memoWorkingOnly=false;window.memoFavoriteOnly=false;setMemoTab('${key}')">${label}</button>`;

  openFloatPanel(`MEMO BOX v${MEMO_BOX_LTS_VERSION}`, `
<style>
.memo-dashboard-grid,.memo-dashboard-row{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:6px 0}
.memo-dashboard button{min-height:44px}
.memo-health-item,.memo-repair-plan{border:1px solid #777;padding:8px;margin:6px 0;border-radius:6px}
.memo-repair-plan del{opacity:.65}.memo-repair-plan ins{text-decoration:none;font-weight:bold}
</style>
${memoBoxDashboardVisible ? buildMemoDashboardHtml() : ""}
<div class="memo-actions">
<button onclick="memoBoxDashboardVisible=!memoBoxDashboardVisible;showMemoBox()">Dashboard</button>
<button onclick="openMemoEditor()">＋新規</button>
<button onclick="runMemoBatchAction()">一括操作 (${memoBoxSelected.size})</button>
<button onclick="showMemoHealthReport()">Health</button>
<button onclick="showMemoRepairPreview('all')">Repair</button>
<button onclick="importMemoBoxes('merge')">複数Import</button>
<button onclick="selectMemoFolderImport()">Folder</button>
<button onclick="selectMemoZipImport()">ZIP</button>
<button onclick="undoLastMemoImport()">↶Undo</button>
<button onclick="restoreMemoAutoBackup()">Backup復元</button>
</div>
<div class="memo-actions">
${tab("all", "All")}${tab("knowledge", "Knowledge")}${tab("simple", "Simple")}${tab("document", "Document")}${tab("relation", "Relation")}${tab("archive", "Archive")}
<button onclick="clearMemoQuickViewFilters()">絞込解除</button>
</div>
<details open><summary>検索 / ソート</summary>
<input id="memoSearch" class="input" placeholder="Title / 本文 / ID / Keywords / Summary / Relationship"
 value="${escapeHtml(memoBoxSearch)}" oninput="memoBoxSearch=this.value;showMemoBox()">
<select onchange="setMemoSort(this.value)">
<option value="updated-desc" ${memoBoxSortKey === "updated-desc" ? "selected" : ""}>更新日 新しい順</option>
<option value="updated-asc" ${memoBoxSortKey === "updated-asc" ? "selected" : ""}>更新日 古い順</option>
<option value="created-desc" ${memoBoxSortKey === "created-desc" ? "selected" : ""}>作成日 新しい順</option>
<option value="name-asc" ${memoBoxSortKey === "name-asc" ? "selected" : ""}>名前</option>
<option value="status-asc" ${memoBoxSortKey === "status-asc" ? "selected" : ""}>Status</option>
<option value="version-desc" ${memoBoxSortKey === "version-desc" ? "selected" : ""}>Version</option>
</select>
</details>
<div class="small-muted">表示 ${filtered.length} / 全 ${memoBoxList.length}件　選択 ${memoBoxSelected.size}件</div>
<div class="memo-list">${memoCards || '<div class="small-muted">該当メモなし</div>'}</div>
<input id="memoBoxImportFile" type="file" accept=".json,.md,.markdown,.txt,.html,.htm,.csv,.tsv" multiple style="display:none" onchange="loadMemoBoxesFile(event)">
`);
}

showMemoBox = showMemoBoxV19;

window.showMemoBox = showMemoBoxV19;
window.showMemoHealthReport = showMemoHealthReport;
window.showMemoRepairPreview = showMemoRepairPreview;
window.applyMemoRepairPlans = applyMemoRepairPlans;
window.toggleMemoWorking = toggleMemoWorking;
window.selectMemoFolderImport = selectMemoFolderImport;
window.selectMemoZipImport = selectMemoZipImport;
window.restoreMemoAutoBackup = restoreMemoAutoBackup;
window.clearMemoQuickViewFilters = clearMemoQuickViewFilters;
window.openMemoById = openMemoById;
window.loadMemoBoxesFile = loadMemoBoxesFile;

console.log("Memo Box v1.9 LTS RC loaded");