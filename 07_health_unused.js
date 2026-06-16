/* ===============================
   FILE: 07_health_unused.js
   Health / Unused Analysis
=============================== */

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
    [...checks].map(
      el => el.value
    );

  const output =
    get("unusedFunctionOutput");

  if (!output) {
    return;
  }

  output.value =
    names.join("\n");

  output.select();

  const ok =
    document.execCommand(
      "copy"
    );

  if (typeof updateRepairStatus === "function") {
    updateRepairStatus(
      `${names.length}件コピー`
    );
  }

  if (!ok) {
    alert("コピー失敗");
  }
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

  if (typeof updateRepairStatus === "function") {
    updateRepairStatus(
      "安全候補を選択しました"
    );
  }
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
