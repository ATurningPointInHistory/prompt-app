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

  const refs =
    extractFunctionReferences(
      text,
      text
    );
  
  const onclicks =
    refs.onclicks;
  
  const eventRefs =
    refs.eventRefs;
  
  const windowRefs =
    refs.windowNames;

  const domReadyRefs =
    [...text.matchAll(
      /DOMContentLoaded[\s\S]{0,500}?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g
    )].map(x => x[1]);

  const config =
    typeof getProjectConfig === "function"
      ? getProjectConfig()
      : {};

  const protectedFunctions =
    new Set([
      ...(
        config.protectedFunctions || []
      ),
      ...(
        config.criticalFunctions || []
      )
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
      countFunctionReferences(
        text,
        fn,
        true
      );

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
    
      const line = text
        .slice(
          0,
          block
            ? block.start
            : 0
        )
        .split("\n")
        .length;
    
      unused.push({
        name: fn,
        line
      });
    
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

healthUnusedFunctions =
    [...unused];

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
      ? unused
          .map(
            item =>
              `${item.name} (L${item.line})`
          )
          .join("\n")
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

function detectFunctionBlockBracketIssues(text) {

  const issues = [];

  if (
    typeof extractFunctionBlocksFromText !==
    "function"
  ) {
    return issues;
  }

  const blocks =
    extractFunctionBlocksFromText(text);

  blocks.forEach(block => {

    const bracketIssues =
      detectBracketMismatch(
        block.block
      );

    bracketIssues.forEach(issue => {

      issues.push(
        block.name +
        ": " +
        issue
      );

    });

  });

  return issues;
}

function extractTemplateStrings(text) {
  const source = String(text || "");
  const results = [];

  const reg = /`([\s\S]*?)`/g;
  let match;

  while ((match = reg.exec(source)) !== null) {
    results.push({
      text: match[1],
      start: match.index
    });
  }

  return results;
}

function detectDuplicateDeclsInFunctions(text) {

  const issues = [];

  if (typeof extractCodeBlocksFromText !== "function") {
    return issues;
  }

  const functionBlocks =
    extractCodeBlocksFromText(text)
      .filter(
        b =>
          b.type === "function" ||
          b.type === "async function"
      );

  functionBlocks.forEach(block => {

    const decls = {};

    const reg =
      /\b(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;

    let m;

    while ((m = reg.exec(block.block)) !== null) {

      const name = m[2];

      decls[name] =
        (decls[name] || 0) + 1;

      if (decls[name] === 2) {
        issues.push(
          `${block.name}: 二重定義疑い: ${name}`
        );
      }
    }
  });

  return issues;
}

function detectTemplateHtmlIssues(text) {
  const issues = [];
  const templates =
    extractTemplateStrings(text);

  templates.forEach((item, index) => {
    const html = item.text;

    const divOpen =
      (html.match(/<div\b/gi) || []).length;

    const divClose =
      (html.match(/<\/div>/gi) || []).length;

    if (divOpen !== divClose) {
      issues.push(
        "template HTML div不一致: template#" +
        (index + 1) +
        " open:" +
        divOpen +
        " close:" +
        divClose
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

function getErrorContext(
  source,
  line,
  radius = 5
) {

  if (!line) {
    return "";
  }

  const lines =
    String(source || "")
      .split("\n");

  const start =
    Math.max(
      0,
      line - radius - 1
    );

  const end =
    Math.min(
      lines.length,
      line + radius
    );

  const result = [];

  for (
    let i = start;
    i < end;
    i++
  ) {

    const prefix =
      i + 1 === line
        ? ">>> "
        : "    ";

    result.push(
      prefix +
      (i + 1) +
      ": " +
      lines[i]
    );
  }

  return result.join("\n");
}

function detectScopeLeakIssues(text) {
  const issues = [];

  // JS構文が正常ならスコープ診断は不要
  // 誤検知が多いため、構文エラー時のみ補助診断として使う
  try {
    new Function(String(text || ""));
    return issues;
  } catch {
    // 構文NG時だけ下の簡易検出を続行
  }

  const source =
    String(text || "");

  const reg =
    /\b(?:try|if|for|while)\s*\([^)]*\)?\s*\{([\s\S]*?)\}\s*[\s\S]{0,300}?(return\s*\{[\s\S]*?\}|return[\s\S]*?;)/g;

  let m;

  while ((m = reg.exec(source)) !== null) {

    const blockText = m[1];
    const afterText = m[2];

    const matches =
      [...blockText.matchAll(
        /\bconst\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g
      )];

    matches.forEach(match => {
      const name = match[1];

      const usedAfter =
        new RegExp(
          "\\b" + escapeRegExp(name) + "\\b"
        ).test(afterText);

      if (usedAfter) {
        const before =
          source.slice(
            0,
            m.index + match.index
          );

        const line =
          before.split("\n").length;

        issues.push(
          "スコープ外参照疑い: " +
          name +
          " line " +
          line
        );
      }
    });
  }

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

function selectAllUnusedChecks() {
  document
    .querySelectorAll(".unused-check")
    .forEach(el => {
      el.checked = true;
    });
}

function clearAllUnusedChecks() {
  document
    .querySelectorAll(".unused-check")
    .forEach(el => {
      el.checked = false;
    });
}

function copySelectedUnusedFunctions() {

  saveSelectedUnusedFunctions();

  const checks =
    document.querySelectorAll(
      ".unused-check:checked"
    );

  const names =
    [...checks]
      .map(
        el => el.value
      );

  const output =
    get(
      "unusedFunctionOutput"
    );

  if (!output) return;

  output.value =
    names.join("\n");

  output.select();

  document.execCommand(
    "copy"
  );

  updateRepairStatus(
    `${names.length}件コピー`
  );
}

function analyzeSelectedUnusedFunctions() {

  saveSelectedUnusedFunctions();

  const checks =
    document.querySelectorAll(
      ".unused-check:checked"
    );

  const names =
    [...checks]
      .map(el => el.value);

  if (names.length === 0) {

    alert(
      "関数を選択してください"
    );

    return;
  }

  const source =
    get("repairEditor")
      ?.value || "";

  const report = [];

  names.forEach(fn => {

    const refs =
      (
        source.match(
          new RegExp(
            "\\b" +
            escapeRegExp(fn) +
            "\\s*\\(",
            "g"
          )
        ) || []
      ).length;

    const onclickUsed =
      new RegExp(
        `onclick=["'][^"']*${escapeRegExp(fn)}\\(`
      ).test(source);

    const eventUsed =
      new RegExp(
        `addEventListener\\([^\\n]+${escapeRegExp(fn)}`
      ).test(source);

    report.push(

`${fn}

参照数:
${Math.max(0, refs - 1)}

onclick:
${onclickUsed ? "あり" : "なし"}

event:
${eventUsed ? "あり" : "なし"}

削除安全度:
${
refs <= 1 &&
!onclickUsed &&
!eventUsed
  ? "★★★★★"
  : refs <= 2
    ? "★★★☆☆"
    : "★☆☆☆☆"
}
`
    );

  });

  openFloatPanel(
    "削除影響確認",
    `
<pre class="code-preview">
${escapeHtml(
  report.join("\n----------------\n")
)}
</pre>
`
  );
}

function previewSelectedUnusedDelete() {

  saveSelectedUnusedFunctions();

  const checks =
    document.querySelectorAll(
      ".unused-check:checked"
    );

  const names =
    [...checks].map(
      el => el.value
    );

  if (names.length === 0) {
    alert("関数を選択してください");
    return;
  }

  const editor =
    get("repairEditor");

  if (!editor) {
    alert("repairEditor が見つかりません");
    return;
  }

  const source =
    editor.value || "";

  const blocks =
    typeof extractFunctionBlocksFromText === "function"
      ? extractFunctionBlocksFromText(source)
      : [];

  const preview = [];

  names.forEach(name => {

    const block =
      blocks.find(
        item => item.name === name
      );

    if (!block) {
      preview.push(
`=== ${name} ===
⚠ function block not found`
      );
      return;
    }

    preview.push(
`=== ${name} ===
${block.block}`
    );

  });

  openFloatPanel(
    "削除プレビュー",
    `
<pre class="code-preview">
${escapeHtml(preview.join("\n\n----------------\n\n"))}
</pre>
`
  );
}

function simulateUnusedDelete() {

  saveSelectedUnusedFunctions();

  const checks =
    document.querySelectorAll(
      ".unused-check:checked"
    );

  const names =
    [...checks]
      .map(el => el.value);

  if (names.length === 0) {

    alert(
      "関数を選択してください"
    );

    return;
  }

  const editor =
    get("repairEditor");

  if (!editor) {

    alert(
      "repairEditorが見つかりません"
    );

    return;
  }

  const source =
    editor.value || "";

  const blocks =
    typeof extractFunctionBlocksFromText ===
    "function"
      ? extractFunctionBlocksFromText(
          source
        )
      : [];

  let simulated =
    source;

  let removedLines = 0;

  const removedFunctions = [];

  names.forEach(name => {

    const block =
      blocks.find(
        item =>
          item.name === name
      );

    if (!block) return;

    removedFunctions.push(
      name
    );

    removedLines +=
      block.block
        .split("\n")
        .length;

    simulated =
      simulated.replace(
        block.block,
        ""
      );

  });

  openFloatPanel(
    "削除シミュレーション",
    `

<div class="small">

削除関数数:
${removedFunctions.length}

<br>

削除行数:
${removedLines}

</div>

<pre class="code-preview">
${escapeHtml(

removedFunctions.join(
"\n"
)

)}
</pre>

`
  );
}

function saveSelectedUnusedFunctions() {
  selectedUnusedFunctions =
    [...document.querySelectorAll(".unused-check:checked")]
      .map(el => el.value);
}

function showUnusedDeleteDiff() {

  saveSelectedUnusedFunctions();

  const names =
    [...selectedUnusedFunctions];

  if (names.length === 0) {

    alert(
      "関数を選択してください"
    );

    return;
  }

  const source =
    get("repairEditor")
      ?.value || "";

  const blocks =
    typeof extractFunctionBlocksFromText ===
    "function"
      ? extractFunctionBlocksFromText(
          source
        )
      : [];

  const diff = [];

  names.forEach(name => {

    const block =
      blocks.find(
        item =>
          item.name === name
      );

    if (!block) return;

    diff.push(
      block.block
        .trim()
        .split("\n")
        .map(
          line => "- " + line
        )
        .join("\n")
    );

  });

  openFloatPanel(
    `削除Diff (${names.length})`,
    `
<pre class="code-preview">
${escapeHtml(
  diff.join(
    "\n\n"
  )
)}
</pre>
`
  );
}

function selectSafeUnusedFunctions() {

  document
    .querySelectorAll(".unused-check")
    .forEach(el => {
      el.checked = true;
    });

  saveSelectedUnusedFunctions();

  updateRepairStatus(
    "安全候補を選択しました"
  );
}

async function deleteSelectedUnusedFunctionsSafe() {

  saveSelectedUnusedFunctions();

  const names =
    [...selectedUnusedFunctions];

  if (names.length === 0) {

    alert(
      "関数を選択してください"
    );

    return;
  }

  const editor =
    get("repairEditor");

  if (!editor) {

    alert(
      "repairEditorが見つかりません"
    );

    return;
  }

  saveDeleteRollbackSnapshot(
    "Unused削除前"
  );

  const source =
    editor.value;

  const blocks =
    typeof extractFunctionBlocksFromText ===
    "function"
      ? extractFunctionBlocksFromText(
          source
        )
      : [];

  let nextSource =
      source;
  
    const targets =
      blocks
        .filter(block =>
          names.includes(
            block.name
          )
        )
        .sort((a, b) =>
          b.start - a.start
        );
  
    targets.forEach(block => {
  
      nextSource =
        nextSource.slice(
          0,
          block.start
        )
        +
        nextSource.slice(
          block.end
        );
  
    });

  editor.value =
    nextSource;

  const validation =
    validateBackupHtml(
      nextSource
    );

  if (
    !validation.js_ok
  ) {

    rollbackLastDelete(true);

    alert(
      "JSエラー検出\n自動ロールバックしました"
    );

    return;
  }

  updateLineNumbers();
  updateCursorPosition();

  updateRepairStatus(
    `削除完了: ${names.length}件`
  );
  
  selectedUnusedFunctions = [];

  closeFloatPanel();

  saveDeleteHistory(
    names
  );

  await showHtmlHealth();

  if (
    healthUndefinedFunctions.length
  ) {
  
    rollbackLastDelete(true);
  
    alert(
      "未定義onclick検出\n自動ロールバックしました\n\n" +
      healthUndefinedFunctions.join("\n")
    );
  
    return;
  }

  if (
    healthUnusedFunctions.length
  ) {

    updateRepairStatus(
      `削除完了: ${names.length}件 / 未使用候補:${healthUnusedFunctions.length}件`
    );

  } else {

    updateRepairStatus(
      `削除完了: ${names.length}件 / 未使用候補なし`
    );

  }

  alert(
    `削除完了\n${names.length}件`
  );

}

function showDeleteHistory() {

  if (
    unusedDeleteHistory.length === 0
  ) {

    alert(
      "削除履歴なし"
    );

    return;
  }

  const html =
    unusedDeleteHistory
      .map(item =>

`<div class="history-item">

<b>${escapeHtml(item.time)}</b>

<br>

${item.count}件

<br>

${escapeHtml(
  item.functions.join(", ")
)}

</div>`

      )
      .join("");

  openFloatPanel(
    "削除履歴",
    html
  );
}

function saveDeleteHistory(names) {

  unusedDeleteHistory.unshift({

    time:
      new Date()
        .toLocaleString(),

    count:
      names.length,

    functions:
      [...names]

  });

  unusedDeleteHistory =
    unusedDeleteHistory.slice(0, 50);

}

function sendUnusedToDeleteCandidate() {

  if (
    !Array.isArray(
      healthUnusedFunctions
    )
  ) {
    alert(
      "Unused Candidate未取得"
    );
    return;
  }

  if (
    healthUnusedFunctions.length === 0
  ) {
    alert(
      "Unused Candidateなし"
    );
    return;
  }

  const listHtml =
    healthUnusedFunctions
      .map(item => `
<label class="unused-row">
  <input
    type="checkbox"
    class="unused-check"
    value="${escapeHtml(item.name)}"
    onchange="saveSelectedUnusedFunctions()"
    ${
      selectedUnusedFunctions.includes(
        item.name
      )
        ? "checked"
        : ""
    }>

  <button
    type="button"
    class="health-action-btn"
    onclick="
      jumpToLine(
        ${item.line}
      )
    ">
    ${escapeHtml(item.name)}
    (L${item.line})
  </button>
</label>
`)
      .join("");

  openFloatPanel(
    `削除候補 (${healthUnusedFunctions.length})`,
    `

<div class="unused-actions">
  <button class="health-action-btn" onclick="copySelectedUnusedFunctions()">📋 コピー</button>
  <button class="health-action-btn" onclick="analyzeSelectedUnusedFunctions()">🔍 analyze</button>
  <button class="health-action-btn" onclick="previewSelectedUnusedDelete()">✂ preview</button>
  <button class="health-action-btn" onclick="simulateUnusedDelete()">🗑 simulate</button>
  <button class="health-action-btn" onclick="showUnusedDeleteDiff()">📊 Diff</button>
  <button class="health-action-btn" onclick="rollbackLastDelete()">↩ 復元</button>
  <button class="health-action-btn" onclick="deleteSelectedUnusedFunctionsSafe()">🗑 削除</button>
  <button class="health-action-btn" onclick="showDeleteHistory()">📚 履歴</button>
  <button class="health-action-btn" onclick="selectAllUnusedChecks()">✅ 全選択</button>
  <button class="health-action-btn" onclick="selectSafeUnusedFunctions()">⭐ 安全のみ</button>
  <button class="health-action-btn" onclick="clearAllUnusedChecks()">⬜ 全解除</button>
</div>

${listHtml}

<textarea
  id="unusedFunctionOutput"
  style="
    width:100%;
    height:120px;
    margin-top:8px;
  "></textarea>

`
  );
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
      /<script\b[^>]*\bsrc=["'][^"']+["'][^>]*>\s*<\/script>\s*/gi,
      ""
    );

  const mergedHtml =
    externalJs.trim()
      ? htmlWithoutExternalScripts.replace(
          /<\/body>/i,
          `
<script>
${externalJs.replace(/<\/script>/gi, "<\\/script>")}
</script>
</body>`
        )
      : htmlWithoutExternalScripts;

  return mergedHtml;
}

function validateBackupHtml(html) {
  const source =
    String(html || "");

  const currentName =
    String(
      typeof currentRepairFile !== "undefined"
        ? currentRepairFile
        : ""
    ).toLowerCase();

  const isHtml =
    looksLikeHtml(source) &&
    !currentName.endsWith(".js");

  if (!isHtml) {
    let jsOk = true;
    let jsError = "";
    let lineMatch = null;

    try {
      new Function(source);
    } catch (e) {
      jsOk = false;

      const stack =
        String(e.stack || "");

      lineMatch =
        stack.match(/<anonymous>:(\d+):(\d+)/);

      jsError =
        e.message +
        "\nstack:\n" +
        stack +
        (
          lineMatch
            ? "\nline: " + lineMatch[1] +
              "\ncolumn: " + lineMatch[2]
            : ""
        );
    }

    return {
      div_ok: true,
      div_open: 0,
      div_close: 0,
      duplicate_ids: [],
      js_ok: jsOk,
      js_error: jsError,
      error_line:
        lineMatch
          ? Number(lineMatch[1])
          : null,
      error_column:
        lineMatch
          ? Number(lineMatch[2])
          : null
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
  let errorLine = null;
  let errorColumn = null;

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

    const stack =
      String(e.stack || "");

    const match =
      stack.match(/<anonymous>:(\d+):(\d+)/);

    if (match) {
      errorLine =
        Number(match[1]);

      errorColumn =
        Number(match[2]);
    }
  }

  return {
    div_ok: divOpen === divClose,
    div_open: divOpen,
    div_close: divClose,
    duplicate_ids: duplicateIds,
    js_ok: jsOk,
    js_error: jsError,
    error_line: errorLine,
    error_column: errorColumn
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