/* ===============================
   FILE: 03_development_rules.js
   Development Rules Manager
=============================== */

/* ===============================
   Development Rules
=============================== */

let developmentRules =
  loadJson(
    "developmentRules",
    []
  );

function saveDevelopmentRules() {

  localStorage.setItem(
    "developmentRules",
    JSON.stringify(
      developmentRules
    )
  );

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

  if (!developmentRules.length) {
    return `
<div class="small-muted">
開発ルールなし
</div>
`;
  }

  return developmentRules
    .map((rule, index) => `
<div class="backup-history-item">

  <pre class="code-preview"
style="white-space:pre-wrap;max-height:220px;overflow:auto;">
${escapeHtml(rule)}
  </pre>

  <div>
    <button onclick="editDevelopmentRule(${index})">
      編集
    </button>

    <button onclick="deleteDevelopmentRule(${index})">
      削除
    </button>
  </div>

</div>
`)
    .join("");

}

/* ===============================
   Render Development Rules
=============================== */

function renderDevelopmentRules() {

  const box =
    get("developmentRulesList");

  if (!box) {
    return;
  }

  box.innerHTML =
    buildDevelopmentRulesHtml();

}

/* ===============================
   Copy Development Rules
=============================== */

function copyDevelopmentRules() {

  const text =
    developmentRules.join(
      "\n"
    );

  if (!text) {
    alert("コピーするルールがありません");
    return;
  }

  const ok =
    copyTextFallback(
      text
    );

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
