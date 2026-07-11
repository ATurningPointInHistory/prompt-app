/* ===============================
   FILE: 03_development_rule_analyzer.js
=============================== */

/* ===============================
   Guess Rule Category
=============================== */

function guessDevelopmentRuleCategory(
  title,
  body
) {

  const text =
    (
      String(title || "") +
      "\n" +
      String(body || "")
    ).toLowerCase();

  if (
    /analyzer|prompt|architect|ai/.test(text)
  ) {
    return "AI";
  }

  if (
    /build|show|render|update|execute|get|共通|関数|命名/.test(text)
  ) {
    return "Coding";
  }

  if (
    /state|database|projectstate|db/.test(text)
  ) {
    return "Database";
  }

  if (
    /test|health|rollback|sandbox/.test(text)
  ) {
    return "Testing";
  }

  if (
    /ui|button|dialog|panel|画面/.test(text)
  ) {
    return "UI";
  }

  if (
    /manager|architecture|責務|設計|phase/.test(text)
  ) {
    return "Architecture";
  }

  if (
    /review|保守|リファクタ|改善/.test(text)
  ) {
    return "Review";
  }

  if (
    /performance|速度|最適化/.test(text)
  ) {
    return "Performance";
  }

  if (
    /security|例外|error|safe/.test(text)
  ) {
    return "Security";
  }

  if (
    /project|package|backup/.test(text)
  ) {
    return "Project";
  }

  return "Other";

}

/* ===============================
   Guess Rule Priority
=============================== */

function guessDevelopmentRulePriority(
  title,
  body
) {

  const text =
    (
      title +
      "\n" +
      body
    ).toLowerCase();

  if (
    /使命|最優先|必ず|禁止|絶対/.test(text)
  ) {
    return "★★★★★";
  }

  if (
    /優先|重要/.test(text)
  ) {
    return "★★★★☆";
  }

  if (
    /推奨|できれば/.test(text)
  ) {
    return "★★★☆☆";
  }

  return "★★☆☆☆";

}

/* ===============================
   Guess Rule Keywords
=============================== */

function guessDevelopmentRuleKeywords(
  title,
  body
) {

  const words =
    (
      title +
      " " +
      body
    )
    .toLowerCase()
    .match(/[a-z]{3,}|[ぁ-んァ-ヶ一-龯]{2,}/g);

  return [
    ...new Set(
      words || []
    )
  ].slice(0, 10);

}

