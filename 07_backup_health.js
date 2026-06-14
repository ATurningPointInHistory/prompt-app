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

    if (/^https?:\/\//i.test(src)) {
      continue;
    }

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

  let jsOk = true;

  try {
    new Function(text);
  } catch {
    jsOk = false;
  }

  if (!jsOk) {
    issues.push(
      ...detectFunctionBlockBracketIssues(text)
    );

    issues.push(
      ...detectDuplicateDeclsInFunctions(text)
    );
  }

  issues.push(
    ...detectTemplateHtmlIssues(text)
  );

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

  const currentName =
    String(
      typeof currentRepairFile !== "undefined"
        ? currentRepairFile
        : ""
    ).toLowerCase();

  const isHtmlSource =
    looksLikeHtml(source) &&
    !currentName.endsWith(".js");

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
    typeof detectGarbageIssues === "function"
      ? detectGarbageIssues(externalJs || source)
      : [];

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
  ? "\n\n=== Error Context ===\n" +
    getErrorContext(
      source,
      validation.error_line
    )
  : ""
}

=== Garbage Check ===
${
garbageIssues.length
  ? garbageIssues.join("\n")
  : "✔ none"
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

  window.latestHealthResult =
    result;

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