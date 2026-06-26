/* ===============================
   FILE: 03_development_rules.js
   Development Rules Manager
=============================== */

/* ===============================
   Development Rules Data
=============================== */

let developmentRules =
  loadJson(
    "developmentRules",
    []
  );

normalizeDevelopmentRules();

let selectedDevelopmentRuleId =
  null;

let developmentRuleSearch =
  "";

const DEVELOPMENT_RULE_CATEGORIES = [
  "Architecture",
  "AI",
  "UI",
  "Coding",
  "Review",
  "Performance",
  "Security",
  "Database",
  "Testing",
  "Project",
  "Other"
];

let developmentRuleCategory =
  "";

function saveDevelopmentRules() {

  normalizeDevelopmentRules();

  localStorage.setItem(
    "developmentRules",
    JSON.stringify(
      developmentRules
    )
  );

}

/* ===============================
   Parse Development Rule
=============================== */

function parseDevelopmentRuleText(text) {

  const raw =
    String(text || "").trim();

  const match =
    raw.match(
      /^【Rule\d+\s+(.+?)】\s*([\s\S]*)$/
    );

  const title =
    match
      ? match[1].trim()
      : "";

  const content =
    match
      ? match[2].trim()
      : raw;

  const bodyMatch =
    content.match(
      /内容：\s*([\s\S]*)$/ 
    );

  const metaText =
    bodyMatch
      ? content.slice(0, bodyMatch.index).trim()
      : "";

  const body =
    bodyMatch
      ? bodyMatch[1].trim()
      : content.trim();

  return {
    title,
    category:
      extractDevelopmentRuleField(
        metaText,
        "category"
      ) || "Architecture",

    priority:
      extractDevelopmentRuleField(
        metaText,
        "priority"
      ) || "",

    status:
      extractDevelopmentRuleField(
        metaText,
        "status"
      ) || "Active",

    version:
      extractDevelopmentRuleField(
        metaText,
        "version"
      ) || "3.0",

    related:
      splitDevelopmentRuleMetaList(
        extractDevelopmentRuleField(
          metaText,
          "related"
        )
      ),

    keywords:
      splitDevelopmentRuleMetaList(
        extractDevelopmentRuleField(
          metaText,
          "keywords"
        )
      ),

    body
  };

}

function extractDevelopmentRuleField(
  text,
  name
) {

  const pattern =
    new RegExp(
      name +
      "：\\s*([\\s\\S]*?)(?=\\n\\s*(category|priority|status|version|related|keywords|内容)：|$)",
      "i"
    );

  const match =
    String(text || "").match(pattern);

  return match
    ? match[1].trim()
    : "";

}

function splitDevelopmentRuleMetaList(
  text
) {

  return String(text || "")
    .split(/[\n,、]+/)
    .map(item => item.trim())
    .filter(Boolean);

}

/* ===============================
   Normalize Development Rules
=============================== */

function normalizeDevelopmentRules() {

  developmentRules =
    (developmentRules || [])
      .map(rule => {

        const now =
          new Date().toISOString();

        if (
          typeof rule === "string"
        ) {

          const parsed =
            parseDevelopmentRuleText(rule);

          return {
            id:
              Date.now() +
              Math.random(),

            category:
              DEVELOPMENT_RULE_CATEGORIES.includes(
                parsed.category
              )
                ? parsed.category
                : guessDevelopmentRuleCategory(
                    parsed.title,
                    parsed.body
                  ),

            priority:
              parsed.priority ||
              guessDevelopmentRulePriority(
                parsed.title,
                parsed.body
              ),

            status:
              parsed.status || "Active",

            version:
              parsed.version || "3.0",

            related:
              parsed.related || [],

            keywords:
              parsed.keywords.length
                ? parsed.keywords
                : guessDevelopmentRuleKeywords(
                    parsed.title,
                    parsed.body
                  ),

            title:
              parsed.title ||
              parseDevelopmentRuleTitle(rule),

            body:
              parsed.body ||
              parseDevelopmentRuleBody(rule),

            created_at:
              now,

            updated_at:
              now
          };

        }

        return {
          id:
            rule.id ||
            Date.now() +
            Math.random(),

          category:
            rule.category ||
            "Architecture",

          priority:
            rule.priority || "",

          status:
            rule.status || "Active",

          version:
            rule.version || "3.0",

          related:
            Array.isArray(rule.related)
              ? rule.related
              : splitDevelopmentRuleMetaList(
                  rule.related
                ),

          keywords:
            Array.isArray(rule.keywords)
              ? rule.keywords
              : splitDevelopmentRuleMetaList(
                  rule.keywords
                ),

          title:
            rule.title ||
            "開発ルール",

          body:
            rule.body ||
            "",

          created_at:
            rule.created_at ||
            now,

          updated_at:
            rule.updated_at ||
            now
        };

      });

}

function formatDevelopmentRule(
  rule,
  index
) {

  return (
    "【Rule" +
    String(index + 1).padStart(3, "0") +
    " " +
    (rule.title || "開発ルール") +
    "】\n\n" +

    "category：\n" +
    (rule.category || "Architecture") +
    "\n\n" +

    "priority：\n" +
    (rule.priority || "") +
    "\n\n" +

    "status：\n" +
    (rule.status || "Active") +
    "\n\n" +

    "version：\n" +
    (rule.version || "3.0") +
    "\n\n" +

    "related：\n" +
    (
      Array.isArray(rule.related)
        ? rule.related.join("\n")
        : String(rule.related || "")
    ) +
    "\n\n" +

    "keywords：\n" +
    (
      Array.isArray(rule.keywords)
        ? rule.keywords.join("\n")
        : String(rule.keywords || "")
    ) +
    "\n\n" +

    "内容：\n\n" +
    (rule.body || "")
  );

}

function parseDevelopmentRuleTitle(
  text
) {

  const match =
    String(text || "")
      .match(
        /^【Rule\d+\s+(.+?)】/
      );

  if (match) {
    return match[1].trim();
  }

  return String(text || "")
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(Boolean) ||
    "開発ルール";

}

function parseDevelopmentRuleBody(
  text
) {

  return String(text || "")
    .replace(
      /^【Rule\d+\s+.+?】\s*/,
      ""
    )
    .trim();

}

/* ===============================
   Add Development Rules
=============================== */

function promptAddDevelopmentRules() {

  const text =
    prompt(
      "開発ルール追加\n\n" +
      "【Rule番号】単位で追加できます。\n" +
      "長いルール文もそのまま貼り付けOKです。\n\n" +
      "例:\n\n" +
      "【Rule1 共通関数優先】\n\n" +
      "新しい関数を書く前に必ず確認する。\n\n" +
      "① 既存関数がないか探す\n" +
      "② build系を利用できないか探す\n" +
      "③ 共通Utilityを利用できないか探す\n" +
      "④ 無ければ新規作成\n\n" +
      "-----------------------------------------\n\n" +
      "【Rule2 build・show・update・executeの責務分離】\n\n" +
      "buildXXXX()\n" +
      "  ・データ生成のみ\n" +
      "  ・HTML生成のみ\n" +
      "  ・副作用禁止",
      ""
    );

  if (!text) {
    return;
  }

  addDevelopmentRules(
    text
  );

}

function addDevelopmentRules(
  text
) {

  const raw =
    String(text || "").trim();

  if (!raw) {
    return;
  }

  const items =
    splitDevelopmentRulesText(
      raw
    );

  if (!items.length) {
    return;
  }

  normalizeDevelopmentRules();

  const existingTexts =
    new Set(
      developmentRules.map((rule, index) =>
        normalizeDevelopmentRuleText(
          formatDevelopmentRule(
            rule,
            index
          )
        )
      )
    );

  items.forEach(item => {

    const parsed =
      parseDevelopmentRuleText(
        item
      );

    const rule = {
      id:
        Date.now() +
        Math.random(),

      category:
        DEVELOPMENT_RULE_CATEGORIES.includes(
          parsed.category
        )
          ? parsed.category
          : guessDevelopmentRuleCategory(
              parsed.title,
              parsed.body
            ),

      priority:
        parsed.priority ||
        guessDevelopmentRulePriority(
          parsed.title,
          parsed.body
        ),

      status:
        parsed.status || "Active",
    
      version:
        parsed.version || "3.0",
    
      related:
        parsed.related || [],
    
      keywords:
        parsed.keywords.length
          ? parsed.keywords
          : guessDevelopmentRuleKeywords(
              parsed.title,
              parsed.body
            ),

      title:
        parsed.title ||
        parseDevelopmentRuleTitle(
          item
        ),

      body:
        parsed.body ||
        parseDevelopmentRuleBody(
          item
        ),

      created_at:
        new Date()
          .toISOString(),

      updated_at:
        new Date()
          .toISOString()
    };

    const normalized =
      normalizeDevelopmentRuleText(
        formatDevelopmentRule(
          rule,
          developmentRules.length
        )
      );

    if (
      !normalized ||
      existingTexts.has(normalized)
    ) {
      return;
    }

    developmentRules.push(
      rule
    );

    existingTexts.add(
      normalized
    );

  });

  saveDevelopmentRules();

  renderDevelopmentRules();

}

/* ===============================
   Delete Development Rule
=============================== */

function deleteDevelopmentRule(
  index
) {

  normalizeDevelopmentRules();

  if (
    index < 0 ||
    index >= developmentRules.length
  ) {
    return;
  }

  if (
    !confirm(
      "このルールを削除しますか？\n\n" +
      formatDevelopmentRule(
        developmentRules[index],
        index
      )
    )
  ) {
    return;
  }

  developmentRules.splice(
    index,
    1
  );

  saveDevelopmentRules();

  renderDevelopmentRules();

}

/* ===============================
   Edit Development Rule
=============================== */

function editDevelopmentRule(
  index
) {

  normalizeDevelopmentRules();

  const rule =
    developmentRules[index];

  if (!rule) {
    return;
  }

  const category =
    prompt(
      "カテゴリ\n\n" +
      DEVELOPMENT_RULE_CATEGORIES.join("\n"),
      rule.category || "Architecture"
    );

  if (category === null) {
    return;
  }

  const title =
    prompt(
      "開発ルール タイトル",
      rule.title || ""
    );

  if (title === null) {
    return;
  }

  const body =
    prompt(
      "開発ルール 内容",
      rule.body || ""
    );

  if (body === null) {
    return;
  }

  rule.category =
    DEVELOPMENT_RULE_CATEGORIES.includes(category)
      ? category
      : "Other";

  rule.title =
    title.trim() ||
    "開発ルール";

  rule.body =
    body.trim();

  rule.updated_at =
    new Date()
      .toISOString();

  saveDevelopmentRules();

  renderDevelopmentRules();

}

/* ===============================
   Build Development Rules Html
=============================== */

function buildDevelopmentRulesHtml() {

  normalizeDevelopmentRules();

  const keyword =
    String(developmentRuleSearch || "")
      .trim()
      .toLowerCase();

  const category =
    developmentRuleCategory;

  if (!developmentRules.length) {
    return `
<div class="small-muted">
開発ルールなし
</div>
`;
  }

  const filteredRules =
    developmentRules.filter(rule => {

      const categoryMatch =
        !category ||
        rule.category === category;

      const keywordMatch =

        !keyword ||

        (rule.title || "")
          .toLowerCase()
          .includes(keyword)

        ||

        (rule.body || "")
          .toLowerCase()
          .includes(keyword)

        ||

        (rule.category || "")
          .toLowerCase()
          .includes(keyword)

        ||

        (rule.priority || "")
          .toLowerCase()
          .includes(keyword)

        ||

        (rule.status || "")
          .toLowerCase()
          .includes(keyword)

        ||

        (rule.version || "")
          .toLowerCase()
          .includes(keyword)

        ||

        (Array.isArray(rule.related)
          ? rule.related.join(" ")
          : String(rule.related || "")
        )
          .toLowerCase()
          .includes(keyword)

        ||

        (Array.isArray(rule.keywords)
          ? rule.keywords.join(" ")
          : String(rule.keywords || "")
        )

          .toLowerCase()
          .includes(keyword);

      return (
        categoryMatch && keywordMatch
      );

    });

  if (!filteredRules.length) {
    return `
<div class="small-muted">
該当する開発ルールなし
</div>
`;
  }

  return filteredRules
    .map((rule, index) => {

      const title =
        "Rule" +
        (
          developmentRules.indexOf(rule) +
          1
        ) +
        " " +
        (rule.title || "開発ルール");

      const originalIndex =
        developmentRules.indexOf(rule);

      return `

<div
  class="
    todo-row
    development-rule-row
  ">

  <div class="todo-text">

    <b>${escapeHtml(title)}</b>

    <pre class="development-rule-body">
${escapeHtml(rule.body || "")}
    </pre>

  </div>

  <div class="development-rule-actions">

    <button onclick="moveDevelopmentRule(${originalIndex}, -1)">
      ↑
    </button>

    <button onclick="moveDevelopmentRule(${originalIndex}, 1)">
      ↓
    </button>

    <button onclick="editDevelopmentRule(${originalIndex})">
      編集
    </button>

    <button onclick="deleteDevelopmentRule(${originalIndex})">
      削除
    </button>

  </div>

</div>

`;

    })
    .join("");

}

/* ===============================
   Render Development Rules
=============================== */

function renderDevelopmentRules() {

  openFloatPanel(

    "📖 開発ルール",

`
<div class="todo-toolbar-top">

  <button
    onclick="toggleDevelopmentRuleMenu('manage')">
    管理 ▼
  </button>

  <button
    onclick="toggleDevelopmentRuleMenu('action')">
    操作 ▼
  </button>

</div>

<div
  id="developmentRuleManageMenu"
  class="todo-menu-grid"
  style="display:none;">

  <button onclick="promptAddDevelopmentRuleForm()">
    Rule
  </button>

  <button onclick="promptAddDevelopmentRules()">
    一括
  </button>

</div>

<div
  id="developmentRuleActionMenu"
  class="todo-menu-grid"
  style="display:none;">

  <button onclick="copyDevelopmentRules()">
    コピー
  </button>

  <button onclick="exportDevelopmentRules()">
    Export
  </button>

  <button onclick="importDevelopmentRules()">
    Import
  </button>

  <input
    id="developmentRuleImportFile"
    type="file"
    accept=".json"
    style="display:none"
    onchange="loadDevelopmentRulesFile(event)">

</div>

<select
  id="developmentRuleCategory"
  onchange="
    updateDevelopmentRuleCategory(
      this.value
    )
  ">

  <option value="">
    すべて
  </option>

  ${DEVELOPMENT_RULE_CATEGORIES
    .map(category => `
<option
  value="${category}"
  ${
    developmentRuleCategory === category
      ? "selected"
      : ""
  }>
  ${category}
</option>
`)
.join("")}

</select>

<input
  id="developmentRuleSearch"
  class="input"
  placeholder="🔍 Rule検索"
  value="${escapeHtml(developmentRuleSearch)}"
  oninput="updateDevelopmentRuleSearch(this.value)">

<div
  id="developmentRulesList"
  class="todo-list">
</div>
`

  );

  const box =
    get(
      "developmentRulesList"
    );

  if (!box) {
    return;
  }

  box.innerHTML =
    buildDevelopmentRulesHtml();

}

function toggleDevelopmentRuleMenu(
  type
) {

  const manage =
    get("developmentRuleManageMenu");

  const action =
    get("developmentRuleActionMenu");

  if (!manage || !action) {
    return;
  }

  if (type === "manage") {

    manage.style.display =
      manage.style.display === "grid"
        ? "none"
        : "grid";

    action.style.display =
      "none";

    return;

  }

  if (type === "action") {

    action.style.display =
      action.style.display === "grid"
        ? "none"
        : "grid";

    manage.style.display =
      "none";

  }

}

/* ===============================
   Copy Development Rules
=============================== */

function copyDevelopmentRules() {

  normalizeDevelopmentRules();

  const text =
    developmentRules
      .map((rule, index) =>
        formatDevelopmentRule(
          rule,
          index
        )
      )
      .join(
        "\n\n-----------------------------------------\n\n"
      );

  if (!text) {
    alert("コピーするルールがありません");
    return;
  }

  const ok =
    copyTextFallback(text);

  alert(
    ok
      ? "開発ルールをコピーしました"
      : "コピー失敗"
  );

}

function splitDevelopmentRulesText(
  text
) {

  const normalized =
    String(text || "")
      .replace(/\r\n/g, "\n")
      .trim();

  if (!normalized) {
    return [];
  }

  const blocks =
    normalized
      .split(
        /\n(?=【Rule\d+\s)/
      )
      .map(block =>
        block
          .replace(
            /^[-=]{5,}\s*/gm,
            ""
          )
          .trim()
      )
      .filter(Boolean);

  return blocks;

}

function normalizeDevelopmentRuleText(
  text
) {

  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

}

function promptAddDevelopmentRuleForm() {

  const title =
    prompt(
      "開発ルール タイトル",
      ""
    );

  if (!title) {
    return;
  }

  const body =
    prompt(
      "開発ルール 内容",
      ""
    );

  if (!body) {
    return;
  }

  addDevelopmentRuleObject(
    title,
    body
  );

}

function addDevelopmentRuleObject(
  title,
  body
) {

  normalizeDevelopmentRules();

  developmentRules.push({
    id:
      Date.now() +
      Math.random(),

    category:
      "Architecture",

    priority:
      "",

    status:
      "Active",

    version:
      "3.0",

    related:
      [],

    keywords:
      [],

    title:
      String(title || "")
        .trim() ||
      "開発ルール",

    body:
      String(body || "")
        .trim(),

    created_at:
      new Date()
        .toISOString(),

    updated_at:
      new Date()
        .toISOString()
  });

  saveDevelopmentRules();

  renderDevelopmentRules();

}

/* ===============================
   Export Development Rules
=============================== */

function exportDevelopmentRules() {

  normalizeDevelopmentRules();

  downloadJsonFile(
    developmentRules,
    "development_rules.json"
  );

}

/* ===============================
   Import Development Rules
=============================== */

function importDevelopmentRules() {

  get(
    "developmentRuleImportFile"
  )?.click();

}

/* ===============================
   Load Development Rules File
=============================== */

function loadDevelopmentRulesFile(
  event
) {

  const file =
    event.target.files?.[0];

  readJsonFile(

    file,

    data => {

      developmentRules =
        data;

      saveDevelopmentRules();

      renderDevelopmentRules();

      alert(
        "Import完了"
      );

    },

    () => {

      alert(
        "JSON読込失敗"
      );

    }

  );

  event.target.value =
    "";

}

/* ===============================
   Select Development Rule
=============================== */

function selectDevelopmentRule(
  id
) {

  selectedDevelopmentRuleId =
    id;

  renderDevelopmentRules();

}

/* ===============================
   Update Development Rule Search
=============================== */

function updateDevelopmentRuleSearch(
  text
) {

  developmentRuleSearch =
    String(text || "");

  const box =
    get("developmentRulesList");

  if (!box) {
    return;
  }

  box.innerHTML =
    buildDevelopmentRulesHtml();

}

function updateDevelopmentRuleCategory(
  category
) {

  developmentRuleCategory =
    String(category || "");

  const box =
    get(
      "developmentRulesList"
    );

  if (!box) {
    return;
  }

  box.innerHTML =
    buildDevelopmentRulesHtml();

}

/* ===============================
   順位入れ替え関数
=============================== */

function moveDevelopmentRule(
  index,
  direction
) {

  normalizeDevelopmentRules();

  const nextIndex =
    index + direction;

  if (
    index < 0 ||
    nextIndex < 0 ||
    index >= developmentRules.length ||
    nextIndex >= developmentRules.length
  ) {
    return;
  }

  const temp =
    developmentRules[index];

  developmentRules[index] =
    developmentRules[nextIndex];

  developmentRules[nextIndex] =
    temp;

  saveDevelopmentRules();

  renderDevelopmentRules();

}

/* ===============================
   Global Export
=============================== */

window.promptAddDevelopmentRules =
  promptAddDevelopmentRules;

window.addDevelopmentRules =
  addDevelopmentRules;

window.deleteDevelopmentRule =
  deleteDevelopmentRule;

window.editDevelopmentRule =
  editDevelopmentRule;

window.buildDevelopmentRulesHtml =
  buildDevelopmentRulesHtml;

window.renderDevelopmentRules =
  renderDevelopmentRules;

window.copyDevelopmentRules =
  copyDevelopmentRules;

window.toggleDevelopmentRuleMenu =
  toggleDevelopmentRuleMenu;

window.promptAddDevelopmentRuleForm =
  promptAddDevelopmentRuleForm;

window.addDevelopmentRuleObject =
  addDevelopmentRuleObject;

window.formatDevelopmentRule =
  formatDevelopmentRule;

window.parseDevelopmentRuleText =
  parseDevelopmentRuleText;

window.selectDevelopmentRule =
  selectDevelopmentRule;

window.exportDevelopmentRules =
  exportDevelopmentRules;

window.importDevelopmentRules =
  importDevelopmentRules;

window.loadDevelopmentRulesFile =
  loadDevelopmentRulesFile;

window.updateDevelopmentRuleSearch =
  updateDevelopmentRuleSearch;

window.updateDevelopmentRuleCategory =
  updateDevelopmentRuleCategory;

window.moveDevelopmentRule =
  moveDevelopmentRule;