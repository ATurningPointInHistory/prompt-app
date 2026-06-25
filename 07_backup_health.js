/* ===============================
   FILE: 07_backup_health.js
   Backup Health Main
=============================== */

/* ===============================
   Health Check
=============================== */

async function collectExternalScriptText(html) {

  const parser =
    new DOMParser();

  const doc =
    parser.parseFromString(
      String(html || ""),
      "text/html"
    );

  const scripts =
    [
      ...doc.querySelectorAll(
        "script[src]"
      )
    ];

  const loadedSrcSet =
    new Set();

  const texts = [];

  for (const script of scripts) {

    const src =
      script.getAttribute("src");

    if (!src) {
      continue;
    }

    if (/^https?:\/\//i.test(src)) {
      continue;
    }

    const key =
      String(src)
        .split("?")[0]
        .trim();

    if (!key) {
      continue;
    }

    if (
      loadedSrcSet.has(key)
    ) {
      continue;
    }

    loadedSrcSet.add(key);

    try {

      const res =
        await fetch(src);

      if (!res.ok) {
        continue;
      }

      const text =
        await res.text();

      texts.push(
`/* ===== ${src} ===== */

${text}`
      );

    } catch (e) {

      console.warn(
        "JS load failed:",
        src,
        e
      );

    }

  }

  return texts.join("\n\n");

}

/* ===============================
   Function Dependency Diagnose
=============================== */

function detectLargeFunctions(text) {

  if (
    typeof extractFunctionBlocksFromText !==
    "function"
  ) {
    return [];
  }

  const blocks =
    extractFunctionBlocksFromText(text);

  const issues = [];

  blocks.forEach(block => {

    const lines =
      block.block.split("\n").length;

    if (lines >= 300) {

      issues.push(
        `巨大function候補: ${block.name} (${lines}行)`
      );

    }

  });

  return issues;
}
function detectGarbageIssues(text) {

  const issues = [];

  const source =
    String(text || "");

  const validation =
    validateBackupHtml(source);

  if (validation.js_ok) {

    return [];

  }

  issues.push(
    "⚠ JS構文NGのため詳細診断を実行"
  );

  if (validation.error_line) {
    issues.push(
      `JS構文エラー位置: L${validation.error_line}`
    );
  }

  issues.push(
    ...detectFunctionBlockBracketIssues(source)
  );

  issues.push(
    ...detectDuplicateDeclsInFunctions(source)
  );

  issues.push(
    ...detectTemplateHtmlIssues(source)
  );

  const missingCommas =
    [...source.matchAll(
      /(["'`][^"'`\n]+["'`])\s*\n\s*(["'`][^"'`\n]+["'`])/g
    )];

  missingCommas.forEach(m => {
    issues.push(
      "カンマつけ忘れ疑い: " +
      m[1] +
      " の後"
    );
  });

  return issues;
}

function toggleHealthSection(id) {
  const el = get(id);
  if (!el) return;

  el.style.display =
    el.style.display === "none"
      ? "block"
      : "none";
}

async function showHtmlHealth() {

  const editor =
    get("repairEditor");

  const source =
    isRepairMode() &&
    editor &&
    editor.value.trim()
      ? editor.value
      : "<!DOCTYPE html>\n" +
        document.documentElement.outerHTML;

  const isHtmlSource =
    looksLikeHtml(source);

  let externalJs = "";

  if (isHtmlSource) {
    try {
      externalJs =
        await collectExternalScriptText(source);
    } catch (e) {
      console.warn(
        "external script collect failed",
        e
      );
    }
  }

  const jsForCheck =
    source + "\n" + externalJs;

  const validation =
    validateBackupHtml(source);

  let funcs = [];

  try {
    const functionBlocks =
      typeof extractFunctionBlocksFromText === "function"
        ? extractFunctionBlocksFromText(jsForCheck)
        : [];

    funcs =
      functionBlocks.length
        ? functionBlocks.map(item => item.name)
        : [...jsForCheck.matchAll(
            /(?:^|\n)\s*(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/g
          )].map(x => x[1]);

  } catch (e) {
    console.warn(
      "function extract failed",
      e
    );

    funcs =
      [...jsForCheck.matchAll(
        /(?:^|\n)\s*(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/g
      )].map(x => x[1]);
  }

  const dupFuncs =
    [...new Set(
      funcs.filter(
        (f, i) =>
          funcs.indexOf(f) !== i
      )
    )];

  const onclicks =
    isHtmlSource
      ? [...source.matchAll(
          /onclick=["']([a-zA-Z0-9_$]+)\(/g
        )].map(x => x[1])
      : [];

  const undefinedFns =
    [...new Set(
      onclicks.filter(
        fn =>
          !funcs.includes(fn)
      )
    )];

  healthUndefinedFunctions =
    [...undefinedFns];

  const score =
    calcHealthScore(
      validation,
      undefinedFns,
      dupFuncs
    );

  const garbageIssues =
    validation.js_ok
      ? []
      : detectGarbageIssues(
          source
        );

  if (
    !validation.js_ok &&
    typeof detectScopeLeakIssues === "function"
  ) {
    garbageIssues.push(
      ...detectScopeLeakIssues(
        externalJs || source
      )
    );
  }

  let result =
`HTML HEALTH REPORT
=== Source Type ===
${isHtmlSource ? "HTML" : "JavaScript"}

=== HTML ===
div:
${isHtmlSource ? (validation.div_ok ? "✔ OK" : "⚠ NG") : "skip: JS file"}
open:
${validation.div_open}
close:
${validation.div_close}

=== ID ===
duplicate ids:
${
isHtmlSource
  ? (
      validation.duplicate_ids.length
        ? validation.duplicate_ids.join("\n")
        : "✔ none"
    )
  : "skip: JS file"
}

=== JavaScript ===
JS syntax:
${validation.js_ok ? "✔ OK" : "⚠ NG"}

${validation.js_error || ""}

${
!validation.js_ok
  ? "line: " +
    (validation.error_line || "?") +
    "\ncolumn: " +
    (validation.error_column || "?") +
    "\n\n=== Error Context ===\n" +
    getErrorContext(
      source,
      validation.error_line
    )
  : ""
}

=== Garbage Check ===
${
validation.js_ok
  ? "✔ JS構文OK"
  : (
      garbageIssues.length
        ? garbageIssues.join("\n")
        : "✔ none"
    )
}

=== Function ===
function count:
${funcs.length}
duplicate functions:
${
dupFuncs.length
? dupFuncs.join("\n")
: "✔ none"
}
undefined onclick:
${
undefinedFns.length
? undefinedFns.join("\n")
: "✔ none"
}
onclick count:
${onclicks.length}

=== Health Score ===
${score}/100
`;

  try {
    if (
      typeof buildFunctionDependencyReport ===
      "function"
    ) {
      const dependencyReport =
        buildFunctionDependencyReport(
          jsForCheck
        );

      result +=
        "\n" + dependencyReport;
    } else {
      result +=
        "\n=== Function Dependency ===\n" +
        "skip: buildFunctionDependencyReport not found\n";
    }
  } catch (e) {
    console.warn(
      "dependency report failed",
      e
    );

    result +=
      "\n=== Function Dependency ===\n" +
      "⚠ dependency report failed\n" +
      e.message +
      "\n";
  }

  const parts =
    result.split(
      "=== Active Functions ==="
    );
  
  const summary =
    parts[0];

  const detail =
    parts[1]
      ? "=== Active Functions ===" + parts[1]
      : "Function Dependencyなし";

window.latestHealthResult =
  result;

window.latestHealthSummaryResult =
  summary;
  
    openFloatPanel(
    "HTML HEALTH",
    `
    <div class="float-panel-actions">
  
      <button
        onclick="copyHealthResult()">
        📋 コピー
      </button>

      <button
        onclick="
        toggleHealthSection(
        'healthActiveFunctions'
        )">
        📚 Functions
      </button>

      <button
        onclick="
        copyHealthFullResult(
        )">
        📚 全文コピー
      </button>

      <button
        onclick="
        sendUnusedToDeleteCandidate()
        ">
        🗑 Unused
      </button>

    </div>
  
    <pre
      class="code-preview">
  ${escapeHtml(summary)}
    </pre>
  
    <pre
      id="healthActiveFunctions"
      class="code-preview"
      style="display:none;">
  ${escapeHtml(detail)}
    </pre>
    `
  );
}

function sanitizeFileNamePart(text) {
  return String(text || "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 20);
}

function getSaveFileLabel() {

  const type =
    prompt(
      "保存区分を選択\n\n" +
      "1: TEST 確認用\n" +
      "2: ADD 機能追加\n" +
      "3: FIX 修正\n" +
      "4: KEEP 区切り保存",
      "2"
    );

  if (type === null) {
    return null;
  }

  const labelMap = {
    "1":"TEST",
    "2":"ADD",
    "3":"FIX",
    "4":"KEEP"
  };

  const label =
    labelMap[type] || "SAVE";

  const note =
    prompt(
      "変更内容 / メモ",
      ""
    );

  if (note === null) {
    return null;
  }

  const safeNote =
    sanitizeFileNamePart(note);

  return safeNote
    ? `${label}_${safeNote}`
    : label;
}

function copyHealthFullResult() {

  const text =
    window.latestHealthResult || "";

  if (!text) {
    alert("コピー内容なし");
    return;
  }

  const ok =
    copyTextFallback(text);

  alert(
    ok
      ? "Health全文をコピーしました"
      : "コピー失敗"
  );
}

/* ===============================
   Backup Helpers
=============================== */

function extractIds(html) {
  const parser = new DOMParser();
  const doc =
    parser.parseFromString(
      String(html || ""),
      "text/html"
    );

  return [...doc.querySelectorAll("[id]")]
    .map(el => el.id)
    .filter(Boolean);
}

/* ===============================
   External Script Helpers
=============================== */

async function backupPartialScript() {

  const html =
    document.documentElement.outerHTML;

  const scripts =
    getExternalScriptSrcList(html);

  if (!scripts.length) {
    alert("外部JSなし");
    return;
  }

  openFloatPanel(
    "部分読込 / 保存",

    `
    <button
      class="float-list-btn"
      onclick="
      loadCurrentIndexToRepair()
      ">
      index.html
    </button>
    `

    +

    scripts.map(src => `

      <button
        class="float-list-btn"
        onclick="
        loadExternalScriptToRepair(
        '${src}'
        )">

        ${src}

      </button>

    `).join("")

  );
}

async function loadExternalScriptToRepair(src){

  try{

    const res =
      await fetch(src);

    if(!res.ok){
      throw new Error(
        "load failed"
      );
    }

    const text =
      await res.text();

    switchAppPage(
      "repair"
    );

    const editor =
      get("repairEditor");

    editor.value =
      text;

    repairOriginalHtml =
      text;

    currentRepairFile =
      src;

    localStorage.setItem(
      "repairCurrentFile",
      currentRepairFile
    );

    repairLastValue =
      editor.value;

    if (typeof updateLineNumbers === "function") {
          updateLineNumbers();
        }

        if (typeof updateCursorPosition === "function") {
          updateCursorPosition();
        }

        if (typeof updateRepairStatus === "function") {
          updateRepairStatus(
            `読込: ${src}`
          );
        }
    closeFloatPanel();

  }catch(err){

    alert(
      "読込失敗\n\n"+
      err.message
    );

  }

}

async function loadCurrentIndexToRepair() {

  try {

    const res =
      await fetch("./index.html");

    if (!res.ok) {

      alert(
        "index.htmlを取得できません"
      );

      return;
    }

    const html =
      await res.text();

    switchAppPage(
      "repair"
    );

    const editor =
      get("repairEditor");

    editor.value =
      html;

    repairOriginalHtml =
      html;

    currentRepairFile =
      "index.html";

    localStorage.setItem(
      "repairCurrentFile",
      currentRepairFile
    );
    repairLastValue =
      html;

    if (typeof updateLineNumbers === "function") {
      updateLineNumbers();
    }

    if (typeof updateCursorPosition === "function") {
      updateCursorPosition();
    }

    if (typeof updateRepairStatus === "function") {
      updateRepairStatus("読込: index.html");
    }
    closeFloatPanel();

  } catch (e) {

    alert(
      "読込失敗\n\n" +
      e.message
    );

  }

}

function getExternalScriptSrcList(html) {

  const parser =
    new DOMParser();

  const doc =
    parser.parseFromString(
      html,
      "text/html"
    );

  return [...doc.querySelectorAll(
    "script[src]"
  )]
    .map(script =>
      script.getAttribute("src")
    )
    .filter(Boolean);
}