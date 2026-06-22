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
   Normalize Development Rules
=============================== */

function normalizeDevelopmentRules() {

  developmentRules =
    (developmentRules || [])
      .map(rule => {

        if (
          typeof rule === "string"
        ) {

          return {
            id:
              Date.now() +
              Math.random(),

            category:
              "Architecture",

            title:
              parseDevelopmentRuleTitle(
                rule
              ),

            body:
              parseDevelopmentRuleBody(
                rule
              ),

            created_at:
              new Date()
                .toISOString(),

            updated_at:
              new Date()
                .toISOString()
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

          title:
            rule.title ||
            "開発ルール",

          body:
            rule.body ||
            "",

          created_at:
            rule.created_at ||
            new Date()
              .toISOString(),

          updated_at:
            rule.updated_at ||
            new Date()
              .toISOString()
        };

      });

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

  const existingTexts =
    new Set(
      developmentRules.map(rule =>
        normalizeDevelopmentRuleText(rule)
      )
    );

  items.forEach(item => {

    const normalized =
      normalizeDevelopmentRuleText(
        item
      );

    if (
      !normalized ||
      existingTexts.has(normalized)
    ) {
      return;
    }

    developmentRules.push(item);

    existingTexts.add(normalized);

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

  if (
    index < 0 ||
    index >= developmentRules.length
  ) {
    return;
  }

  if (
    !confirm(
      "このルールを削除しますか？\n\n" +
      developmentRules[index]
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

  if (
    index < 0 ||
    index >= developmentRules.length
  ) {
    return;
  }

  const next =
    prompt(
      "開発ルール編集",
      developmentRules[index]
    );

  if (next === null) {
    return;
  }

  const value =
    next.trim();

  if (!value) {
    return;
  }

  developmentRules[index] =
    value;

  saveDevelopmentRules();

  renderDevelopmentRules();

}

/* ===============================
   Build Development Rules Html
=============================== */

function buildDevelopmentRulesHtml() {

  normalizeDevelopmentRules();

  if (!developmentRules.length) {
    return `
<div class="small-muted">
開発ルールなし
</div>
`;
  }

  return developmentRules
    .map((rule, index) => {

      const title =
        "Rule" +
        (index + 1) +
        " " +
        (rule.title || "開発ルール");

      return `
<div class="todo-row">

  <div class="todo-text">
    <b>${escapeHtml(title)}</b>
    <pre
style="white-space:pre-wrap;font-size:11px;margin:6px 0 0;">
${escapeHtml(rule.body || "")}
    </pre>
  </div>

  <button onclick="editDevelopmentRule(${index})">
    編集
  </button>

  <button onclick="deleteDevelopmentRule(${index})">
    削除
  </button>

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

</div>

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
      manage.style.display === "flex"
        ? "none"
        : "flex";

    action.style.display =
      "none";

  }

  if (type === "action") {

    action.style.display =
      action.style.display === "flex"
        ? "none"
        : "flex";

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

/* ===============================
   Normalize Development Rules
=============================== */

function normalizeDevelopmentRules() {

  developmentRules =
    (developmentRules || [])
      .map(rule => {

        if (typeof rule === "string") {

          const parsed =
            parseDevelopmentRuleText(
              rule
            );

          return {
            title:
              parsed.title ||
              "開発ルール",

            body:
              parsed.body ||
              rule,

            created_at:
              new Date()
                .toISOString()
          };

        }

        return {
          title:
            rule.title ||
            "開発ルール",

          body:
            rule.body ||
            "",

          created_at:
            rule.created_at ||
            new Date()
              .toISOString()
        };

      });

}

function parseDevelopmentRuleText(
  text
) {

  const raw =
    String(text || "")
      .trim();

  const match =
    raw.match(
      /^【Rule\d+\s+(.+?)】\s*([\s\S]*)$/
    );

  if (!match) {
    return {
      title: "",
      body: raw
    };
  }

  return {
    title:
      match[1].trim(),

    body:
      match[2].trim()
  };

}

function formatDevelopmentRule(
  rule,
  index
) {

  const title =
    rule.title ||
    "開発ルール";

  const body =
    rule.body ||
    "";

  return (
    "【Rule" +
    (index + 1) +
    " " +
    title +
    "】\n\n" +
    body
  );

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
    title:
      String(title || "")
        .trim(),

    body:
      String(body || "")
        .trim(),

    created_at:
      new Date()
        .toISOString()
  });

  saveDevelopmentRules();

  renderDevelopmentRules();

}

function formatDevelopmentRule(
  rule,
  index
) {

  normalizeDevelopmentRules();

  const title =
    rule.title ||
    "開発ルール";

  const body =
    rule.body ||
    "";

  return (
    "【Rule" +
    (index + 1) +
    " " +
    title +
    "】\n\n" +
    body
  );

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
