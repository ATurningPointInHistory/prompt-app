
/* ===============================
   FILE: 07_backup_health.js
   Backup / Health / Safe Mode
=============================== */

/* ===============================
   Health Check
=============================== */

async function collectExternalScriptText(html) {

  const parser =
    new DOMParser();

  const doc =
    parser.parseFromString(
      html,
      "text/html"
    );

  const scripts =
    [...doc.querySelectorAll(
      'script[src]'
    )];

  const texts = [];

  for (const script of scripts) {

    const src =
      script.getAttribute("src");

    if (!src) continue;

    try {

      const res =
        await fetch(src);

      if (res.ok) {

        texts.push(
`/* ===== ${src} ===== */

${await res.text()}`
        );

      }

    } catch (e) {

      console.warn(
        "JS load failed:",
        src
      );

    }

  }

  return texts.join("\n\n");
}

function calcHealthScore(validation, undefinedFns, dupFuncs) {
  return Math.max(
    0,
    100
    - (validation.div_ok ? 0 : 20)
    - (validation.js_ok ? 0 : 25)
    - (validation.duplicate_ids.length * 5)
    - (undefinedFns.length * 10)
    - (dupFuncs.length * 10)
  );
}

function getHtmlSummary(html) {
  const funcs = extractFunctionNames(html);
  const ids = extractIds(html);
  const validation = validateBackupHtml(html);
  const dupFuncs =
    [...new Set(
      funcs.filter((f, i) => funcs.indexOf(f) !== i)
    )];
  const onclicks =
    [...String(html || "").matchAll(
      /onclick="([a-zA-Z0-9_$]+)\(/g
    )].map(x => x[1]);
  const undefinedFns =
    [...new Set(
      onclicks.filter(fn => !funcs.includes(fn))
    )];
  const score =
    calcHealthScore(
      validation,
      undefinedFns,
      dupFuncs
    );
  return {
    funcs,
    ids,
    validation,
    dupFuncs,
    undefinedFns,
    score
  };
}

/* ===============================
   Function Dependency Diagnose
=============================== */

function buildFunctionDependencyReport(source) {

  const text =
    String(source || "");

  const functionBlocks =
    typeof extractFunctionBlocksFromText === "function"
      ? extractFunctionBlocksFromText(text)
      : [];

  const uniqueFuncs =
    [...new Set(
      functionBlocks.map(item => item.name)
    )];

  const blockMap =
    new Map();

  functionBlocks.forEach(block => {
    if (!blockMap.has(block.name)) {
      blockMap.set(block.name, block);
    }
  });

  const onclicks =
    [...text.matchAll(
      /onclick\s*=\s*["']\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g
    )].map(x => x[1]);

  const eventRefs =
    [...text.matchAll(
      /addEventListener\s*\(\s*["'][^"']+["']\s*,\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/g
    )].map(x => x[1]);

  const windowRefs =
    [...text.matchAll(
      /window\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g
    )].map(x => x[1]);

  const domReadyRefs =
    [...text.matchAll(
      /DOMContentLoaded[\s\S]{0,500}?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g
    )].map(x => x[1]);

  const protectedFunctions =
    new Set([
      "loadSettings",
      "initImportFileEvents",
      "handleRepairSearchKey",
      "initRepairIde",
      "toggleTemplateManager",
      "toggleDangerManager",
      "togglePatternManager",
      "saveCurrentState",
      "saveHistory",
      "saveTemplate",
      "exportTemplates",
      "importTemplates",
      "exportAiPresets",
      "importAiPresets",
      "saveAiPresetFromEditor",
      "resetAiPreset",
      "saveDangerWord",
      "savePattern",
      "applyTemplateFromSelect",
      "clearHistory"
    ]);

  const result = [];

  const unused = [];

  uniqueFuncs.forEach(fn => {

    const block =
      blockMap.get(fn);

    const body =
      block
        ? block.block
        : "";

    const calls =
      uniqueFuncs.filter(other => {

        if (other === fn) return false;

        return new RegExp(
          "\\b" +
          escapeRegExp(other) +
          "\\s*\\(",
          "g"
        ).test(body);

      });

    const directCallCount =
      (
        text.match(
          new RegExp(
            "\\b" +
            escapeRegExp(fn) +
            "\\s*\\(",
            "g"
          )
        ) || []
      ).length;

    const usedByOnclick =
      onclicks.includes(fn);

    const usedByEvent =
      eventRefs.includes(fn);

    const usedByWindow =
      windowRefs.includes(fn);

    const usedByDomReady =
      domReadyRefs.includes(fn);

    const isUnused =
      directCallCount <= 1 &&
      !usedByOnclick &&
      !usedByEvent &&
      !usedByWindow &&
      !usedByDomReady &&
      !protectedFunctions.has(fn);

    if (isUnused) {
      unused.push(fn);
      return;
    }

    const info = [];

    info.push(
      "used:" + directCallCount
    );

    if (calls.length) {
      info.push(
        "calls:" + calls.join(", ")
      );
    }

    if (usedByOnclick) info.push("onclick");
    if (usedByEvent) info.push("event");
    if (usedByWindow) info.push("window");
    if (usedByDomReady) info.push("domReady");

    result.push(
`${fn}
${info.join("\n")}`
    );

  });

  return [
    "",
    "=== Active Functions ===",
    "",
    result.length
      ? result.join("\n\n")
      : "none",
    "",
    "=== Unused Candidate ===",
    "",
    unused.length
      ? unused.join("\n")
      : "none",
    ""
  ].join("\n");
}

function detectBracketMismatch(text) {
  const issues = [];
  const stack = [];

  const openers = {
    "(": ")",
    "[": "]",
    "{": "}"
  };

  const closers = {
    ")": "(",
    "]": "[",
    "}": "{"
  };

  let line = 1;
  let col = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === "\n") {
      line++;
      col = 0;
      continue;
    }

    col++;

    if (openers[ch]) {
      stack.push({
        ch,
        line,
        col
      });
      continue;
    }

    if (closers[ch]) {
      const last = stack.pop();

      if (!last || last.ch !== closers[ch]) {
        issues.push(
          "括弧不一致疑い: " +
          ch +
          " が余分 line " +
          line +
          ", col " +
          col
        );
      }
    }
  }

  stack.forEach(item => {
    issues.push(
      "括弧閉じ忘れ疑い: " +
      item.ch +
      " line " +
      item.line +
      ", col " +
      item.col
    );
  });

  return issues;
}

function detectGarbageIssues(text) {
  const issues = [];

  issues.push(
    ...detectBracketMismatch(text)
  );

  const brokenHtmlTags =
    text.match(
      /<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s+[^\n<>]*)?$/gm
    ) || [];

  brokenHtmlTags.forEach(tag => {
    issues.push(
      "HTMLタグ閉じ忘れ疑い: " + tag
    );
  });

  const missingCommas =
    [...text.matchAll(
      /(["'`][^"'`\n]+["'`])\s*\n\s*(["'`][^"'`\n]+["'`])/g
    )];

  missingCommas.forEach(m => {
    issues.push(
      "カンマつけ忘れ疑い: " +
      m[1] +
      " の後"
    );
  });

  const duplicateDecls = {};

  const declReg =
    /\b(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;

  let match;

  while ((match = declReg.exec(text)) !== null) {
    const name = match[2];

    duplicateDecls[name] =
      (duplicateDecls[name] || 0) + 1;

    if (duplicateDecls[name] === 2) {
      issues.push(
        "二重定義疑い: " + name
      );
    }
  }

  return issues;
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

  const score =
    calcHealthScore(
      validation,
      undefinedFns,
      dupFuncs
    );

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

  window.latestHealthResult =
    result;

  openFloatPanel(
    "HTML HEALTH",
    `
    <div class="float-panel-actions">
      <button onclick="copyHealthResult()">
        📋 コピー
      </button>
    </div>
    <pre
      id="healthResultBox"
      class="code-preview">
${escapeHtml(result)}
    </pre>
    `
  );
}

function diagnoseHtml() {
  let html =
    "<!DOCTYPE html>\n" +
    document.documentElement.outerHTML;

  const scripts =
    getExternalScriptSrcList(html);

  const scriptInfo =
    scripts.length
      ? "✔ external scripts:\n" +
        scripts.join("\n")
      : "✔ external scripts:none";

  html = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");

  const report = [];

  report.push("AIプロンプト生成Pro HTML診断");
  report.push("v5.7.2 Diagnose External JS\n");

  const tags = [
    "div",
    "section",
    "article",
    "main",
    "header",
    "footer"
  ];

  tags.forEach(tag => {
    const open =
      (html.match(
        new RegExp(`<${tag}\\b`, "gi")
      ) || []).length;

    const close =
      (html.match(
        new RegExp(`</${tag}>`, "gi")
      ) || []).length;

    report.push(
      open === close
        ? `✔ ${tag}: ${open}/${close}`
        : `⚠ ${tag}: ${open}/${close}`
    );
  });

  const ids =
    [...document.querySelectorAll("[id]")]
      .map(el => el.id);

  const dupIds =
    [...new Set(
      ids.filter(
        (id, i) =>
        ids.indexOf(id) !== i
      )
    )];

  report.push(
    dupIds.length
      ? `⚠ id重複\n${dupIds.join("\n")}`
      : "✔ id重複なし"
  );

  report.push("");
  report.push(scriptInfo);

  try {
    [...document.scripts].forEach(s => {
      if (s.src) return;
      new Function(s.textContent);
    });

    report.push("");
    report.push("✔ JS構文OK");

  } catch (e) {
    report.push("");
    report.push(
      `⚠ JS構文エラー\n${e.message}`
    );
  }

  const box =
    get("diagnoseBox");

  box.style.display =
    "block";

  box.innerText =
    report.join("\n");
}


function copyHealthResult() {
  const text =
    window.latestHealthResult || "";
  if (!text) {
    alert("コピー内容なし");
    return;
  }
  if (
    navigator.clipboard &&
    window.isSecureContext
  ) {
    navigator.clipboard
      .writeText(text)
      .then(()=>
        alert("コピー完了")
      )
      .catch(()=>{
        const ok =
          copyTextFallback(text);
        alert(
          ok
          ? "コピー完了"
          : "コピー失敗"
        );
      });
    return;
  }
  const ok =
    copyTextFallback(text);
  alert(
    ok
    ? "コピー完了"
    : "コピー失敗"
  );
}

/* ===============================
   Backup Core
=============================== */

async function getCleanProgramHtml() {
  const clone =
    document.documentElement.cloneNode(true);

  const floatPanel =
    clone.querySelector("#floatPanel");

  if (floatPanel) {
    floatPanel.innerHTML = "";
    floatPanel.removeAttribute("style");
    floatPanel.style.display = "none";
    floatPanel.style.left = "";
    floatPanel.style.top = "";
    floatPanel.style.right = "18px";
    floatPanel.style.bottom = "88px";
  }

  const toolsBtn =
    clone.querySelector("#toolsBtn");

  if (toolsBtn) {
    toolsBtn.innerText = "⚙";
  }

  [
    "debugBox",
    "diagnoseBox",
    "warningBox",
    "repairPreview"
  ].forEach(id => {
    const el =
      clone.querySelector("#" + id);

    if (el) {
      el.innerHTML = "";
      el.innerText = "";
      el.style.display = "none";
    }
  });

  [
    "template-manager",
    "danger-manager",
    "pattern-manager",
    "ai-preset-manager"
  ].forEach(id => {
    const el =
      clone.querySelector("#" + id);

    if (el) {
      el.style.display = "none";
    }
  });

  const output =
    clone.querySelector("#output");

  if (output) {
    output.innerText = "ここに表示";
  }

  const lineNumbers =
    clone.querySelector("#lineNumbers");

  if (lineNumbers) {
    lineNumbers.innerHTML = "1";
  }

  const cursorStatus =
    clone.querySelector("#cursorStatus");

  if (cursorStatus) {
    cursorStatus.innerText = "Ln 1 / Col 1";
  }

  const repairEditor =
    clone.querySelector("#repairEditor");

  if (repairEditor) {
    repairEditor.value = "";
    repairEditor.innerHTML = "";
  }

  [
    "commandBox",
    "presetBox",
    "templateList",
    "dangerList",
    "patternList",
    "history"
  ].forEach(id => {
    const el =
      clone.querySelector("#" + id);

    if (el) {
      el.innerHTML = "";
    }
  });

const html =
    "<!DOCTYPE html>\n" +
    clone.outerHTML;

  const externalJs =
    await collectExternalScriptText(html);

  const htmlWithoutExternalScripts =
    html.replace(
      /<script\s+src="[^"]+"\s*><\/script>\s*/g,
      ""
    );

  const mergedHtml =
    htmlWithoutExternalScripts.replace(
      /<\/body>/i,
      `
<script>
${externalJs.replace(/<\/script>/gi, "<\\/script>")}
</script>
</body>`
    );

  return mergedHtml;
}

function validateBackupHtml(html) {
  const source =
    String(html || "");

  const isHtml =
    looksLikeHtml(source);

  if (!isHtml) {
    let jsOk = true;
    let jsError = "";

    try {
      new Function(source);
    } catch (e) {
      jsOk = false;
      jsError = e.message;
    }

    return {
      div_ok: true,
      div_open: 0,
      div_close: 0,
      duplicate_ids: [],
      js_ok: jsOk,
      js_error: jsError
    };
  }

  const cleanHtml = source
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");

  const divOpen =
    (cleanHtml.match(/<div\b/gi) || []).length;

  const divClose =
    (cleanHtml.match(/<\/div>/gi) || []).length;

  const parser =
    new DOMParser();

  const doc =
    parser.parseFromString(
      source,
      "text/html"
    );

  const ids =
    [...doc.querySelectorAll("[id]")]
      .map(el => el.id)
      .filter(Boolean);

  const duplicateIds =
    [...new Set(
      ids.filter((id, i) => ids.indexOf(id) !== i)
    )];

  let jsOk = true;
  let jsError = "";

  try {
    const scripts =
      [...doc.querySelectorAll("script")];

    scripts.forEach(s => {
      if (s.src) return;
      new Function(s.textContent);
    });
  } catch (e) {
    jsOk = false;
    jsError = e.message;
  }

  return {
    div_ok: divOpen === divClose,
    div_open: divOpen,
    div_close: divClose,
    duplicate_ids: duplicateIds,
    js_ok: jsOk,
    js_error: jsError
  };
}

function preSaveCheck(html) {

  let source = html;

  if (!source) {
    source =
      isRepairMode() &&
      get("repairEditor") &&
      get("repairEditor").value.trim()
        ? get("repairEditor").value
        : "<!DOCTYPE html>\n" +
          document.documentElement.outerHTML;
  }

  const summary =
    getHtmlSummary(source);

  const warnings = [];

  if (!summary.validation.div_ok) {
    warnings.push(
      "div整合性NG"
    );
  }

  if (!summary.validation.js_ok) {
    warnings.push(
      "JS構文エラー"
    );
  }

  if (
    summary.validation
      .duplicate_ids.length
  ) {
    warnings.push(
      "id重複"
    );
  }

  if (
    summary.dupFuncs.length
  ) {
    warnings.push(
      "function重複"
    );
  }

  if (
    summary.undefinedFns.length
  ) {
    warnings.push(
      "未定義onclick"
    );
  }

  if (
    summary.score < 80
  ) {
    warnings.push(
      `Health Score低下 (${summary.score}/100)`
    );
  }

  if (
    warnings.length === 0
  ) {
    return true;
  }

  return confirm(
    "保存前チェック警告\n\n" +
    warnings.join("\n") +
    "\n\n続行しますか？"
  );
}

async function backupProgram() {

  saveCurrentState();

  const html =
    await getCleanProgramHtml();

  const suffix =
    getSaveFileLabel();

  if (!suffix) {
    return;
  }

  if (!preSaveCheck(html)) {
    return;
  }

  const backupData = {
    backup_type: "AI_PROMPT_PRO_FULL_BACKUP",
    backup_format_version: "1.1",
    version: APP_VERSION,
    created_at: new Date().toISOString(),
    backup_note: suffix,
    changelog: CHANGELOG,
    validation: {
      ...validateBackupHtml(
        "<!DOCTYPE html>\n" +
        document.documentElement.outerHTML
      ),
      external_scripts:
        getExternalScriptSrcList(
          document.documentElement.outerHTML
        )
    },
    html: html,
    localStorageData: {
      templates: loadJson("templates", []),
      aiPresets: loadJson("aiPresets", {}),
      dangerWords: loadJson("dangerWords", []),
      dangerPatterns: loadJson("dangerPatterns", []),
      history: loadJson("h", []),
      rawInput: localStorage.getItem("rawInput"),
      roleValue: localStorage.getItem("roleValue"),
      taskValue: localStorage.getItem("taskValue"),
      detailsValue: localStorage.getItem("detailsValue"),
      toneValue: localStorage.getItem("toneValue"),
      roughTone: localStorage.getItem("roughTone"),
      roughOutputFormat: localStorage.getItem("roughOutputFormat"),
      aiTarget: localStorage.getItem("aiTarget"),
      currentTab: localStorage.getItem("currentTab"),
      darkMode: localStorage.getItem("darkMode")
    }
  };

  const blob =
    new Blob(
      [JSON.stringify(backupData, null, 2)],
      { type: "application/json" }
    );

  const a =
    document.createElement("a");

  a.href =
    URL.createObjectURL(blob);

  const timestamp =
    new Date()
      .toISOString()
      .replace(/[:.]/g, "-");

  a.download =
    `${suffix}_AIProBackup_${APP_VERSION}_${timestamp}.json`;

  a.click();

  setTimeout(() => {
    URL.revokeObjectURL(a.href);
  }, 1000);

  saveBackupHistory(backupData);
  manageBackupHistory();

  alert(
    "フルバックアップ保存完了\n\n" +
    suffix
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

async function saveProgramHtml() {

  const html =
    await getCleanProgramHtml();

  if (!preSaveCheck(html)) {
    return;
  }

  const suffix =
    getSaveFileLabel();

  if (!suffix) {
    return;
  }

  const blob =
    new Blob(
      [html],
      { type: "text/html" }
    );

  const a =
    document.createElement("a");

  a.href =
    URL.createObjectURL(blob);

  const timestamp =
    new Date()
      .toISOString()
      .replace(/[:.]/g, "-");

  a.download =
`${suffix}_AIPromptPro_${APP_VERSION}_${timestamp}.html`;

  a.click();

  setTimeout(() => {

    URL.revokeObjectURL(
      a.href
    );

  }, 1000);

  alert(
    "本体HTML保存完了\n\n" +
    suffix
  );
}
function restoreProgramBackup() {
  const input =
    document.createElement("input");

  input.type = "file";
  input.accept = ".json,application/json";

  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader =
      new FileReader();

    reader.onload = () => {
      try {
        const data =
          JSON.parse(reader.result);

        if (!data || !data.localStorageData) {
          alert("フルバックアップ形式ではありません");
          return;
        }

        const scripts =
          data.validation?.external_scripts || [];

        const info =
          "バックアップ情報\n\n" +

          "version: " +
          (
            data.app_version ||
            data.version ||
            "不明"
          ) +
          "\n" +

          "created_at: " +
          (data.created_at || "不明") +
          "\n" +

          "note: " +
          (data.backup_note || "なし") +
          "\n\n" +

          "validation:\n" +

          "div: " +
          (
            data.validation?.div_ok
              ? "OK"
              : "NG"
          ) +
          "\n" +

          "js: " +
          (
            data.validation?.js_ok
              ? "OK"
              : "NG"
          ) +
          "\n\n" +

          "External Scripts:\n" +
          (
            scripts.length
              ? scripts.join("\n")
              : "なし"
          ) +

          "\n\n復元方法を選んでください。\n\n" +

          "OK：設定のみ復元\n" +
          "キャンセル：中止\n\n" +

          "※HTML本体は修復モードで読み込んで保存してください。";

        const ok =
          confirm(info);

        if (!ok) return;

        restoreLocalStorageOnly(
          data.localStorageData
        );

        alert(
          "設定のみ復元完了。再読み込みします。"
        );

        location.reload();

      } catch (err) {
        alert(
          "フル復元に失敗しました\n\n" +
          err.message
        );
      }
    };

    reader.readAsText(file);
  };

  input.click();
}

function restoreLocalStorageOnly(localStorageData) {
  Object.entries(localStorageData)
    .forEach(([key, value]) => {
      if (value === null || value === undefined) {
        localStorage.removeItem(key);
        return;
      }
      if (typeof value === "string") {
        localStorage.setItem(key, value);
      } else {
        localStorage.setItem(
          key,
          JSON.stringify(value)
        );
      }
    });
}

/* ===============================
   Backup History
=============================== */

function saveBackupHistory(backupData) {
  const list = loadJson("backupHistory", []);

  list.unshift({
    version: backupData.version,
    created_at: backupData.created_at,
    backup_note: backupData.backup_note || "",
    validation: backupData.validation || null,
    html: backupData.html,
    localStorageData: backupData.localStorageData
  });

  localStorage.setItem(
    "backupHistory",
    JSON.stringify(list.slice(0, 10))
  );
}

function showBackupHistory() {
  const list = loadJson("backupHistory", []);

  if (list.length === 0) {
    alert("バックアップ履歴はありません");
    return;
  }

  openFloatPanel(
    "バックアップ履歴",
    list.map((b, i) => `
      <div class="backup-history-item">
        <div>
          <b>${i + 1}. ${escapeHtml(b.version || "-")}</b>
        </div>
        <div>
          ${escapeHtml(b.created_at || "-")}
        </div>
        <div>
          メモ: ${escapeHtml(b.backup_note || "メモなし")}
        </div>
        <div class="float-panel-actions">
          <button onclick="restoreBackupHistory(${i})">
            復元
          </button>
          <button onclick="markBackupUnused(${i})">
            ⚠ 不要
          </button>
          <button onclick="deleteBackupHistory(${i})">
            🗑 削除
          </button>
        </div>
      </div>
    `).join("")
  );
}

function markBackupUnused(index) {
  const list = loadJson("backupHistory", []);
  const item = list[index];

  if (!item) return;

  if (
    !confirm(
      "このバックアップを不要候補にしますか？\n\n" +
      "Version: " + (item.version || "-") + "\n" +
      "メモ: " + (item.backup_note || "メモなし")
    )
  ) {
    return;
  }

  if (
    !String(item.backup_note || "")
      .startsWith("[不要候補]")
  ) {
    item.backup_note =
      "[不要候補] " +
      (item.backup_note || "");
  }

  localStorage.setItem(
    "backupHistory",
    JSON.stringify(list)
  );

  showBackupHistory();
}

function deleteBackupHistory(index) {
  const list = loadJson("backupHistory", []);
  const item = list[index];

  if (!item) return;

  if (
    !confirm(
      "バックアップを完全削除しますか？\n\n" +
      "Version: " + (item.version || "-") + "\n" +
      "作成日時: " + (item.created_at || "-") + "\n\n" +
      "メモ:\n" + (item.backup_note || "メモなし")
    )
  ) {
    return;
  }

  list.splice(index, 1);

  localStorage.setItem(
    "backupHistory",
    JSON.stringify(list)
  );

  showBackupHistory();
}

function restoreBackupHistory(index) {
  const list = loadJson("backupHistory", []);
  const item = list[index];

  if (!item) {
    alert("履歴が見つかりません");
    return;
  }

  const ok =
    confirm(
      "このバックアップ履歴を復元しますか？\n\n" +
      "Version: " + (item.version || "-") + "\n" +
      "メモ: " + (item.backup_note || "メモなし")
    );

  if (!ok) return;

  Object.entries(item.localStorageData || {}).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
    } else if (typeof value === "string") {
      localStorage.setItem(key, value);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  });

  alert("履歴から復元しました。再読み込みします。");
  location.reload();
}

function manageBackupHistory() {
  const list = loadJson("backupHistory", []);

  localStorage.setItem(
    "backupHistory",
    JSON.stringify(list.slice(0, 10))
  );
}

/* ===============================
   Backup Compare / Diff
=============================== */

function compareBackupSummary() {
  const input =
    document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !data.html) {
          alert("比較できるバックアップ形式ではありません");
          return;
        }
        const currentHtml =
          isRepairMode() &&
          get("repairEditor") &&
          get("repairEditor").value.trim()
            ? get("repairEditor").value
            : "<!DOCTYPE html>\n" +
              document.documentElement.outerHTML;
        const oldHtml = data.html;
        const current =
          getHtmlSummary(currentHtml);
        const old =
          getHtmlSummary(oldHtml);
        const addedFuncs =
          current.funcs.filter(x => !old.funcs.includes(x));
        const removedFuncs =
          old.funcs.filter(x => !current.funcs.includes(x));
        const addedIds =
          current.ids.filter(x => !old.ids.includes(x));
        const removedIds =
          old.ids.filter(x => !current.ids.includes(x));
        const result =
`バックアップ差分サマリー
【比較元】
version:
${data.app_version || data.version || "不明"}
created_at:
${data.created_at || "不明"}
backup note:
${data.backup_note || "なし"}
【Health Score】
現在:
${current.score}/100
バックアップ:
${old.score}/100
差:
${current.score - old.score}
【Function】
現在:
${current.funcs.length}
バックアップ:
${old.funcs.length}
追加function:
${addedFuncs.length ? addedFuncs.join("\n") : "なし"}
削除function:
${removedFuncs.length ? removedFuncs.join("\n") : "なし"}
【ID】
現在:
${current.ids.length}
バックアップ:
${old.ids.length}
追加id:
${addedIds.length ? addedIds.join("\n") : "なし"}
削除id:
${removedIds.length ? removedIds.join("\n") : "なし"}
【現在の警告】
重複id:
${current.validation.duplicate_ids.length ? current.validation.duplicate_ids.join("\n") : "なし"}
重複function:
${current.dupFuncs.length ? current.dupFuncs.join("\n") : "なし"}
未定義onclick:
${current.undefinedFns.length ? current.undefinedFns.join("\n") : "なし"}
`;
        showDiffResult(result);
      } catch (err) {
        alert(
          "差分確認に失敗しました\n\n" +
          err.message
        );
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function showDiffResult(text) {
  openFloatPanel(
    "差分確認結果",
    `
    <div class="float-panel-actions">
      <button onclick="copyDiffResult()">📋 コピー</button>
      <button onclick="clearDiffResult()">🧹 クリア</button>
    </div>
    <pre id="diffResultBox" class="code-preview">${escapeHtml(text)}</pre>
    `
  );
  window.latestDiffResult = text;
}

function copyDiffResult() {
  const text =
    window.latestDiffResult || "";

  if (!text) {
    alert("コピーする差分結果がありません");
    return;
  }

  if (
    navigator.clipboard &&
    window.isSecureContext
  ) {
    navigator.clipboard
      .writeText(text)
      .then(() =>
        alert("差分結果をコピーしました")
      )
      .catch(() => {
        const ok =
          copyTextFallback(text);

        alert(
          ok
            ? "差分結果をコピーしました"
            : "コピー失敗"
        );
      });

    return;
  }

  const ok =
    copyTextFallback(text);

  alert(
    ok
      ? "差分結果をコピーしました"
      : "コピー失敗"
  );
}

function clearDiffResult() {
  window.latestDiffResult = "";
  closeFloatPanel();
}

/* ===============================
   Backup Helpers
=============================== */

function extractFunctionNames(html) {
  const source =
    String(html || "");

  if (
    typeof extractFunctionBlocksFromText ===
    "function"
  ) {
    return extractFunctionBlocksFromText(source)
      .map(item => item.name);
  }

  return [
    ...source.matchAll(
      /(?:^|\n)\s*(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/g
    )
  ].map(m => m[1]);
}

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
        repairLastValue =
          html;

    updateLineNumbers();

    updateCursorPosition();

    updateRepairStatus(
      "読込: index.html"
    );

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

/* ===============================
   Safe Mode
=============================== */

function checkSafeMode() {
  const crash =
    localStorage.getItem("lastCrash");

  if (!crash) return;

  let info = {};

  try {
    info = JSON.parse(crash);
  } catch {
    info = {
      message: String(crash),
      time: "unknown"
    };
  }

  const msg =
`SAFE MODE
前回エラー終了を検出しました。

message:
${info.message || "unknown"}

line:
${info.line || "unknown"}

column:
${info.column || "unknown"}

time:
${info.time || "unknown"}

修復モードで起動しますか？`;

  const ok =
    confirm(msg);

  if (!ok) {
    localStorage.removeItem("lastCrash");
    return;
  }

  switchAppPage("repair");

  const draft =
    localStorage.getItem(
      "repairDraftHtml"
    );

  if (
    draft &&
    !get("repairEditor").value.trim()
  ) {
    get("repairEditor").value =
      draft;

    repairLastValue =
      draft;

    if (typeof updateLineNumbers === "function") {
          updateLineNumbers();
        }

        if (typeof updateCursorPosition === "function") {
      updateCursorPosition();
        }

        if (typeof updateRepairStatus === "function") {
          updateRepairStatus(
            "SAFE MODE復元"
          );
        }
  }

  const debugBox =
    get("debugBox");

  if (debugBox) {
    debugBox.style.display = "block";
    debugBox.innerText =
`SAFE MODE
前回クラッシュ情報

message:
${info.message || "unknown"}

line:
${info.line || "unknown"}

column:
${info.column || "unknown"}

time:
${info.time || "unknown"}`;
  }

  localStorage.removeItem("lastCrash");
}

/* ===============================
   Health full
=============================== */

async function saveProjectPackage() {

  try {

    if (typeof JSZip === "undefined") {

      alert(
        "JSZipが読み込まれていません"
      );

      return;
    }

    const zip =
      new JSZip();

    const timestamp =
      new Date()
        .toISOString()
        .replace(/[:.]/g,"-");

    // index.html

    const html =

      "<!DOCTYPE html>\n" +

      document.documentElement
        .outerHTML;

    zip.file(
      "index.html",
      html
    );

    // 分割JS

    const files = [

      "00_bootstrap.js",
      "01_core.js",
      "02_prompt.js",
      "03_data.js",
      "04_tools.js",
      "05_repair.js",
      "06_search.js",
      "07_backup_health.js",
      "08_init.js"

    ];

    for (const file of files) {

      try {

        const res =
          await fetch(file);

        if (!res.ok) {
          continue;
        }

        const text =
          await res.text();

        zip.file(
          file,
          text
        );

      } catch {}

    }

    // 情報

    zip.file(

      "project_info.json",

      JSON.stringify({

        project:
          "AIプロンプト生成Pro",

        version:
          get("versionLabel")
            ?.innerText ||

          "unknown",

        savedAt:
          new Date()
            .toISOString(),

        functionCount:
          (
            document.body.innerHTML
              .match(
                /function\s+[a-zA-Z0-9_$]+\s*\(/g
              ) || []
          ).length

      },

      null,

      2)

    );

    const blob =
      await zip.generateAsync({

        type:"blob"

      });

    const a =
      document.createElement("a");

    a.href =
      URL.createObjectURL(blob);

    a.download =

      `AIPro_Project_${timestamp}.zip`;

    a.click();

    setTimeout(()=>{

      URL.revokeObjectURL(
        a.href
      );

    },1000);

    alert(
      "プロジェクト保存完了"
    );

  } catch(e) {

    alert(

      "保存失敗\n\n" +

      e.message

    );

  }

}

/* ===============================
   Project JS Health
=============================== */

function analyzeProjectJsDependency() {

  const input =
    document.createElement("input");

  input.type = "file";
  input.accept = ".html,.htm,text/html";

  input.onchange = (event) => {

    const file =
      event.target.files &&
      event.target.files[0];

    if (!file) return;

    const reader =
      new FileReader();

    reader.onload = () => {

      const html =
        String(reader.result || "");

      const scripts =
        [...html.matchAll(
          /<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi
        )]
        .map(match => match[1]);

      const localScripts =
        scripts.filter(src =>
          !/^https?:\/\//i.test(src)
        );

      const cdnScripts =
        scripts.filter(src =>
          /^https?:\/\//i.test(src)
        );

      const result =
        "Project JS Health\n\n" +
        "=== Source ===\n" +
        file.name +
        "\n\n" +

        "=== Local JS Files ===\n" +
        (
          localScripts.length
            ? localScripts.join("\n")
            : "none"
        ) +
        "\n\n" +

        "=== CDN / External JS ===\n" +
        (
          cdnScripts.length
            ? cdnScripts.join("\n")
            : "none"
        ) +
        "\n\n" +

        "=== Summary ===\n" +
        "local scripts: " + localScripts.length + "\n" +
        "external scripts: " + cdnScripts.length;

      window.latestProjectJsHealth =
        result;

      openFloatPanel(
        "Project JS Health",
        `
<div class="float-panel-actions">
  <button onclick="copyProjectJsHealth()">
    📋 コピー
  </button>
</div>

<pre class="code-preview">
${escapeHtml(result)}
</pre>
`
      );
    };

    reader.readAsText(
      file,
      "UTF-8"
    );
  };

  input.click();
}

function copyProjectJsHealth() {

  const text =
    window.latestProjectJsHealth || "";

  if (!text) {
    alert("コピー内容なし");
    return;
  }

  if (
    navigator.clipboard &&
    window.isSecureContext
  ) {
    navigator.clipboard
      .writeText(text)
      .then(() => alert("コピー完了"))
      .catch(() => {
        const ok = copyTextFallback(text);
        alert(ok ? "コピー完了" : "コピー失敗");
      });

    return;
  }

  const ok =
    copyTextFallback(text);

  alert(
    ok
      ? "コピー完了"
      : "コピー失敗"
  );
}
