/* ===============================
   FILE: 05_repair.js
   Repair IDE
=============================== */

/* ===============================
   Repair State
=============================== */

let repairUndoStack = [];
let repairRedoStack = [];
let repairLastValue = "";
let repairAutoSaveEnabled = false;
let currentRepairFile = "";
let functionSortList = [];
let functionSortFilter = "all";
let dragSortIndex = null;
let pinnedLine = null;
let repairOriginalHtml = "";


/* ===============================
   Repair Diff
=============================== */

function generateRepairDiff() {

  const editor =
    get("repairEditor");

  if (!editor) {
    alert("repairEditorが見つかりません");
    return null;
  }

  if (!repairOriginalHtml) {
    alert(
      "元HTMLがありません。\n" +
      "先にHTMLを読み込んでください。"
    );
    return null;
  }

  const originalBlocks =
    extractFunctionBlocksFromText(
      repairOriginalHtml
    );

  const currentBlocks =
    extractFunctionBlocksFromText(
      editor.value
    );

  const originalMap =
    new Map();

  const currentMap =
    new Map();

  originalBlocks.forEach(block => {
    originalMap.set(
      block.name,
      block
    );
  });

  currentBlocks.forEach(block => {
    currentMap.set(
      block.name,
      block
    );
  });

  const changes = [];

  // replace / delete
  originalMap.forEach(
    (originalBlock, name) => {

      const currentBlock =
        currentMap.get(name);

      if (!currentBlock) {

        changes.push({
          type: "deleteFunction",
          target: name
        });

        return;
      }

      if (
        originalBlock.block.trim() !==
        currentBlock.block.trim()
      ) {

        changes.push({
          type: "replaceFunction",
          target: name,
          newCode:
            currentBlock.block
        });

      }

    }
  );

  // add
  currentMap.forEach(
    (currentBlock, name) => {

      if (
        originalMap.has(name)
      ) {
        return;
      }

      changes.push({
        type: "addFunction",
        target: name,
      
        section:
          findSectionNameForPosition(
            editor.value,
            currentBlock.start
          ),
      
        newCode:
          currentBlock.block
      });

    }
  );

  const diff = {

    version: "1.0",

    createdAt:
      new Date()
        .toISOString(),

    changes

  };

  return diff;

}

function showRepairDiff() {

  const diff =
    generateRepairDiff();

  if (!diff) {
    return;
  }

  const json =
    JSON.stringify(
      diff,
      null,
      2
    );

  openFloatPanel(
    "Repair Diff",
    `
<div class="float-panel-actions">

<button
onclick="copyRepairDiff()">
📋 コピー
</button>

</div>

<pre
class="code-preview"
id="repairDiffBox">
${escapeHtml(json)}
</pre>
`
  );

  window.latestRepairDiff =
    json;

}

function copyRepairDiff() {

  const text =
    window.latestRepairDiff || "";

  if (!text) {
    alert(
      "Diffがありません"
    );
    return;
  }

  const ok =
    copyTextFallback(text);

  alert(
    ok
      ? "Diffコピー完了"
      : "コピー失敗"
  );

}

function findSectionNameForPosition(text, position) {

  const blocks =
    extractCodeBlocksFromText(text)
      .filter(
        x => x.type === "section"
      );

  let current =
    "Unknown";

  blocks.forEach(block => {

    if (
      block.start <= position
    ) {
      current =
        block.name;
    }

  });

  return current;
}

function buildLineDiff(oldText, newText) {

  const oldLines =
    String(oldText || "").split("\n");

  const newLines =
    String(newText || "").split("\n");

  const max =
    Math.max(
      oldLines.length,
      newLines.length
    );

  const rows = [];

  for (let i = 0; i < max; i++) {

    const oldLine =
      oldLines[i];

    const newLine =
      newLines[i];

    if (oldLine === newLine) {
      rows.push({
        type: "same",
        oldNo: i + 1,
        newNo: i + 1,
        text: oldLine || ""
      });
      continue;
    }

    if (oldLine !== undefined) {
      rows.push({
        type: "delete",
        oldNo: i + 1,
        newNo: "",
        text: oldLine
      });
    }

    if (newLine !== undefined) {
      rows.push({
        type: "add",
        oldNo: "",
        newNo: i + 1,
        text: newLine
      });
    }
  }

  return rows;
}

function showRepairLineDiff() {

  const editor =
    get("repairEditor");

  if (!editor || !editor.value.trim()) {
    alert("修復モードでHTMLを読み込んでください");
    return;
  }

  if (!repairOriginalHtml) {
    alert("元HTMLがありません。先にHTMLを読み込んでください。");
    return;
  }

  const rows =
    buildLineDiffLCS(
      repairOriginalHtml,
      editor.value
    );

  const changedRows =
    rows.filter(row =>
      row.type !== "same"
    );

  const html =
    changedRows.length
      ? changedRows.map((row, index) => {

          const next =
            changedRows[index + 1];

          const isReplaceDelete =
            row.type === "delete" &&
            next &&
            next.type === "add";

          if (isReplaceDelete) {

            const inline =
              buildInlineDiff(
                row.text,
                next.text
              );

            return `
<div class="line-diff-row line-diff-delete">
  <span class="line-diff-no">${row.oldNo}</span>
  <span class="line-diff-no"></span>
  <span class="line-diff-mark">-</span>
  <span class="line-diff-code">${inline.oldHtml}</span>
</div>
<div class="line-diff-row line-diff-add">
  <span class="line-diff-no"></span>
  <span class="line-diff-no">${next.newNo}</span>
  <span class="line-diff-mark">+</span>
  <span class="line-diff-code">${inline.newHtml}</span>
</div>
`;
          }

          if (
            row.type === "add" &&
            index > 0 &&
            changedRows[index - 1].type === "delete"
          ) {
            return "";
          }

          return `
<div class="line-diff-row line-diff-${row.type}">
  <span class="line-diff-no">${row.oldNo}</span>
  <span class="line-diff-no">${row.newNo}</span>
  <span class="line-diff-mark">${
    row.type === "add"
      ? "+"
      : row.type === "delete"
      ? "-"
      : " "
  }</span>
  <span class="line-diff-code">${escapeHtml(row.text)}</span>
</div>
`;
        }).join("")
      : "差分なし";

  openFloatPanel(
    `GitHub風 Line Diff：読込時 → 現在 (${changedRows.length})`,
    `
<div class="float-panel-actions">

<button onclick="showRepairDiff()">
🧩 Function Diff
</button>

<button onclick="saveRepairDiff()">
💾 Diff保存
</button>

</div>

<div class="line-diff-box">
${html}
</div>
`
  );
}

function buildLineDiffLCS(oldText, newText) {

  const oldLines =
    String(oldText || "").split("\n");

  const newLines =
    String(newText || "").split("\n");

  const m = oldLines.length;
  const n = newLines.length;

  const dp =
    Array.from(
      { length: m + 1 },
      () => Array(n + 1).fill(0)
    );

  for (let i = m - 1; i >= 0; i--) {

    for (let j = n - 1; j >= 0; j--) {

      if (oldLines[i] === newLines[j]) {

        dp[i][j] =
          dp[i + 1][j + 1] + 1;

      } else {

        dp[i][j] =
          Math.max(
            dp[i + 1][j],
            dp[i][j + 1]
          );

      }

    }

  }

  const rows = [];

  let i = 0;
  let j = 0;

  while (i < m && j < n) {

    if (oldLines[i] === newLines[j]) {

      rows.push({
        type: "same",
        oldNo: i + 1,
        newNo: j + 1,
        text: oldLines[i]
      });

      i++;
      j++;

      continue;
    }

    if (
      dp[i + 1][j] >=
      dp[i][j + 1]
    ) {

      rows.push({
        type: "delete",
        oldNo: i + 1,
        newNo: "",
        text: oldLines[i]
      });

      i++;

    } else {

      rows.push({
        type: "add",
        oldNo: "",
        newNo: j + 1,
        text: newLines[j]
      });

      j++;

    }

  }

  while (i < m) {

    rows.push({
      type: "delete",
      oldNo: i + 1,
      newNo: "",
      text: oldLines[i]
    });

    i++;

  }

  while (j < n) {

    rows.push({
      type: "add",
      oldNo: "",
      newNo: j + 1,
      text: newLines[j]
    });

    j++;

  }

  return rows;

}

function buildInlineDiff(oldText, newText) {

  const oldChars =
    Array.from(
      String(oldText || "")
    );

  const newChars =
    Array.from(
      String(newText || "")
    );

  const m =
    oldChars.length;

  const n =
    newChars.length;

  const dp =
    Array.from(
      { length: m + 1 },
      () => Array(n + 1).fill(0)
    );

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {

      if (oldChars[i] === newChars[j]) {
        dp[i][j] =
          dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] =
          Math.max(
            dp[i + 1][j],
            dp[i][j + 1]
          );
      }

    }
  }

  const oldParts = [];
  const newParts = [];

  let i = 0;
  let j = 0;

  while (i < m && j < n) {

    if (oldChars[i] === newChars[j]) {

      const text =
        escapeHtml(oldChars[i]);

      oldParts.push(text);
      newParts.push(text);

      i++;
      j++;

      continue;
    }

    if (
      dp[i + 1][j] >=
      dp[i][j + 1]
    ) {

      oldParts.push(
        `<span class="inline-remove">${
          escapeHtml(oldChars[i])
        }</span>`
      );

      i++;

    } else {

      newParts.push(
        `<span class="inline-add">${
          escapeHtml(newChars[j])
        }</span>`
      );

      j++;

    }
  }

  while (i < m) {
    oldParts.push(
      `<span class="inline-remove">${
        escapeHtml(oldChars[i])
      }</span>`
    );
    i++;
  }

  while (j < n) {
    newParts.push(
      `<span class="inline-add">${
        escapeHtml(newChars[j])
      }</span>`
    );
    j++;
  }

  return {
    oldHtml:
      oldParts.join(""),

    newHtml:
      newParts.join("")
  };
}

function saveRepairDiff() {

  const diff =
    generateRepairDiff();

  if (!diff) {
    return;
  }

  if (
    !diff.changes ||
    diff.changes.length === 0
  ) {
    alert("保存する差分がありません");
    return;
  }

  const json =
    JSON.stringify(
      diff,
      null,
      2
    );

  const timestamp =
    new Date()
      .toISOString()
      .replace(/[:.]/g, "-");

  const filename =
    "RepairDiff_" + timestamp + ".json";

  const blob =
    new Blob(
      [json],
      {
        type: "application/json;charset=utf-8"
      }
    );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href =
    url;

  a.download =
    filename;

  document.body.appendChild(a);

  a.click();

  document.body.removeChild(a);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);

  if (typeof updateRepairStatus === "function") {
    updateRepairStatus(
      "Diff保存完了: " + filename
    );
  }

  alert(
    "Diff保存完了\n\n" +
    filename
  );
}

function loadAndApplyRepairDiff() {

  const input =
    document.createElement("input");

  input.type = "file";
  input.accept = ".json,application/json";

  input.onchange = (event) => {

    const file =
      event.target.files &&
      event.target.files[0];

    if (!file) return;

    const reader =
      new FileReader();

    reader.onload = () => {

      try {

        const diff =
          JSON.parse(reader.result);

        const baseHtml =
          repairOriginalHtml ||
          get("repairEditor").value;

        const patched =
          applyRepairDiff(
            baseHtml,
            diff
          );

        if (!patched) return;

        const editor =
          get("repairEditor");

        repairUndoStack.push(
          editor.value
        );

        repairRedoStack = [];

        editor.value =
          patched;

        repairLastValue =
          patched;

        updateLineNumbers();
        updateCursorPosition();
        autoSaveRepairDraft();

        updateRepairStatus(
          "Diff適用: " + file.name
        );

        alert(
          "Diffを適用しました\n\n" +
          file.name
        );

      } catch (e) {

        alert(
          "Diff JSONの読み込み/適用に失敗しました\n\n" +
          e.message
        );

      }

    };

    reader.readAsText(
      file,
      "UTF-8"
    );

  };

  input.click();
}

function applyRepairDiff(baseHtml, diff) {

  if (!baseHtml || !String(baseHtml).trim()) {
    alert("適用元HTMLが空です");
    return null;
  }

  if (
    !diff ||
    !Array.isArray(diff.changes)
  ) {
    alert("Diff形式が正しくありません");
    return null;
  }

  let html =
    String(baseHtml);

  diff.changes.forEach(change => {

    if (change.type === "replaceFunction") {

      const block =
        findFunctionBlockInText(
          html,
          change.target
        );

      if (!block) {
        console.warn(
          "replace対象なし:",
          change.target
        );
        return;
      }

      html =
        html.slice(0, block.start) +
        change.newCode +
        html.slice(block.end);
    }

    if (change.type === "deleteFunction") {

      const block =
        findFunctionBlockInText(
          html,
          change.target
        );

      if (!block) {
        console.warn(
          "delete対象なし:",
          change.target
        );
        return;
      }

      html =
        html.slice(0, block.start) +
        html.slice(block.end);
    }

    if (change.type === "addFunction") {

      const section =
        extractCodeBlocksFromText(html)
          .find(block =>
            block.type === "section" &&
            block.name === change.section
          );

      if (section) {
        html =
          html.slice(0, section.end) +
          "\n\n" +
          change.newCode +
          "\n" +
          html.slice(section.end);
      } else {
        html +=
          "\n\n" +
          change.newCode +
          "\n";
      }

    }

  });

  return html;
}

function savePatchedRepairHtml() {

  const editor =
    get("repairEditor");

  if (!editor || !editor.value.trim()) {
    alert("保存するPatched HTMLがありません");
    return;
  }

  const html =
    editor.value;

  const timestamp =
    new Date()
      .toISOString()
      .replace(/[:.]/g, "-");

  const baseName =
    currentRepairFile
      ? currentRepairFile.replace(/\.[^.]+$/, "")
      : "PatchedHtml";

  const ext =
    currentRepairFile &&
    currentRepairFile.toLowerCase().endsWith(".js")
      ? ".js"
      : ".html";
  
  const filename =
    baseName +
    "_patched_" +
    timestamp +
    ext;

  const blob =
    new Blob(
      [html],
      {
        type: "text/html;charset=utf-8"
      }
    );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href =
    url;

  a.download =
    filename;

  document.body.appendChild(a);

  a.click();

  document.body.removeChild(a);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);

  if (typeof updateRepairStatus === "function") {
    updateRepairStatus(
      "Patched HTML保存完了: " + filename
    );
  }

  alert(
    "Patched HTML保存完了\n\n" +
    filename
  );
}

/* ===============================
   Repair Cleanup Tools
=============================== */

async function cleanupCandidates() {
  const editor = get("repairEditor");

  if (!editor || !editor.value.trim()) {
    alert("修復モードでHTMLを読み込んでから実行してください");
    return;
  }

  const html = editor.value;

  const externalJs =
    await collectExternalScriptText(html);

  const jsForCheck =
    html + "\n" + externalJs;

  const functionBlocks =
    extractFunctionBlocksFromText(
      jsForCheck
    );

  const funcs =
    functionBlocks.map(item => item.name);

  const refs =
    extractFunctionReferences(
      jsForCheck,
      html
    );
  
  const onclicks =
    refs.onclicks;
  
  const eventRefs =
    refs.eventRefs;
  
  const windowRefs =
    refs.windowRefs;
  
  const labelFors =
    refs.labelFors;

  const parser =
    new DOMParser();

  const doc =
    parser.parseFromString(
      html,
      "text/html"
    );

  const ids =
    [...doc.querySelectorAll("[id]")]
      .map(el => el.id)
      .filter(Boolean)
      .filter(id =>
        !id.startsWith("cleanup-")
      );

  const config =
  typeof getProjectConfig === "function"
    ? getProjectConfig()
    : {};

  const systemIgnoreFuncs =
    typeof getSystemIgnoreFunctions === "function"
      ? getSystemIgnoreFunctions()
      : new Set();
  
  const safeIgnoreFuncs =
    new Set([
      ...(
        config.protectedFunctions || []
      ),
      ...(
        config.criticalFunctions || []
      ),
      ...systemIgnoreFuncs
    ]);

  const unusedFuncs =
    funcs.filter(fn => {

      if (safeIgnoreFuncs.has(fn)) {
        return false;
      }

      if (
        jsForCheck.includes(
          "cleanup候補: 未使用function " + fn
        )
      ) {
        return false;
      }

      if (onclicks.includes(fn)) {
        return false;
      }

      if (eventRefs.includes(fn)) {
        return false;
      }

      if (windowRefs.includes(fn)) {
        return false;
      }

      const count =
        countFunctionReferences(
          jsForCheck,
          fn,
          false
        );

      return count <= 1;
    });

  const safeIgnoreIds =
    typeof getSystemIgnoreIds === "function"
      ? getSystemIgnoreIds()
      : new Set();

  const orphanIds =
    ids.filter(id => {

      if (!id) {
        return false;
      }

      if (safeIgnoreIds.has(id)) {
        return false;
      }

      if (
        html.includes(
          `data-cleanup-disabled-id="${id}"`
        )
      ) {
        return false;
      }

      if (labelFors.includes(id)) {
        return false;
      }

      if (jsForCheck.includes("#" + id)) {
        return false;
      }

      if (/[\$\{\}\(\)\[\]\^\|\\]/.test(id)) {
        return false;
      }

      try {
        const count =
          countFunctionReferences(
            jsForCheck,
            id,
            false
          );

        return count <= 1;

      } catch {
        return false;
      }
    });

  if (
    unusedFuncs.length === 0 &&
    orphanIds.length === 0
  ) {
    alert(
      "削除候補はありません。\n\n" +
      "未使用function：0件\n" +
      "孤立id：0件"
    );

    if (typeof updateRepairStatus === "function") {
      updateRepairStatus(
        "削除候補なし"
      );
    }

    return;
  }

  const message =
    "削除候補チェック\n\n" +
    "【未使用function】(" + unusedFuncs.length + ")\n" +
    (unusedFuncs.length ? unusedFuncs.join("\n") : "なし") +
    "\n\n【孤立id】(" + orphanIds.length + ")\n" +
    (orphanIds.length ? orphanIds.join("\n") : "なし") +
    "\n\nOKで修復エディタ内の候補を安全処理します。\n\n" +
    "未使用function：コメント化\n" +
    "孤立id：idをdata-cleanup-disabled-idへ変更";

  const ok =
    confirm(message);

  if (!ok) {
    return;
  }

  commentOutCleanupCandidates(
    unusedFuncs,
    orphanIds
  );
}

function commentOutCleanupCandidates(unusedFuncs, orphanIds) {
  const editor = get("repairEditor");

  if (!editor || !editor.value.trim()) {
    alert("修復モードでHTMLを読み込んでから実行してください");
    return;
  }

  let html = editor.value;

  repairUndoStack.push(html);
  repairRedoStack = [];

  unusedFuncs.forEach(fn => {
    const block =
      findFunctionBlockInText(html, fn);

    if (!block) return;
    if (block.block.includes("cleanup候補")) return;

    html =
      html.slice(0, block.start) +
      "/* cleanup候補: 未使用function " + fn + "\n" +
      block.block +
      "\n*/" +
      html.slice(block.end);
  });

  orphanIds.forEach(id => {
    const reg = new RegExp(
      `\\s+id=(["'])${escapeRegExp(id)}\\1`,
      "g"
    );

    html = html.replace(reg, match => {
      if (match.includes("cleanup-disabled-id")) {
        return match;
      }

      return (
        ` data-cleanup-disabled-id="${id}"` +
        ` data-cleanup-note="cleanup候補: 孤立id"`
      );
    });
  });

  editor.value = html;
  repairLastValue = html;

  updateLineNumbers();
  updateCursorPosition();
  autoSaveRepairDraft();

  if (typeof updateRepairStatus === "function") {
    updateRepairStatus(
      "削除候補を安全処理しました"
    );
  }

  alert(
    "削除候補を安全処理しました。\n\n" +
    "未使用function：コメント化\n" +
    "孤立id：data-cleanup-disabled-id に変更\n\n" +
    "HTML HEALTH / 編集内容診断で確認してください。"
  );
}

function deleteCommentedCleanupBlocks() {
  const editor = get("repairEditor");

  if (!editor || !editor.value.trim()) {
    alert("修復モードでHTMLを読み込んでから実行してください");
    return;
  }

  let html = editor.value;
  const before = html;

  const cleanupBlockRegex =
    /\/\*\s*cleanup候補:\s*未使用function\s+[a-zA-Z0-9_$]+[\s\S]*?\*\//g;

  const functionBlocks =
    (html.match(cleanupBlockRegex) || [])
      .filter(block =>
        /function\s+[a-zA-Z0-9_$]+\s*\(/.test(block) ||
        /(?:const|let|var)\s+[a-zA-Z0-9_$]+\s*=/.test(block) ||
        /window\.[a-zA-Z0-9_$]+\s*=/.test(block)
      );

  const disabledIds =
    html.match(
      /\sdata-cleanup-disabled-id="[^"]+"/g
    ) || [];

  const cleanupNotes =
    html.match(
      /\sdata-cleanup-note="cleanup候補:\s*孤立id"/g
    ) || [];

  if (
    functionBlocks.length === 0 &&
    disabledIds.length === 0 &&
    cleanupNotes.length === 0
  ) {
    alert("削除対象はありません");
    return;
  }

  const message =
    "完全削除確認\n\n" +
    "削除対象:\n" +
    "・コメント化済みfunction: " + functionBlocks.length + "件\n" +
    "・無効化済みid属性: " + disabledIds.length + "件\n" +
    "・cleanupメモ属性: " + cleanupNotes.length + "件\n\n" +
    "OKで完全削除します。\n" +
    "事前にバックアップ保存済みか確認してください。";

  const ok = confirm(message);

  if (!ok) {
    return;
  }

  html = html.replace(cleanupBlockRegex, "");

  html = html.replace(
    /\sdata-cleanup-disabled-id="[^"]+"/g,
    ""
  );

  html = html.replace(
    /\sdata-cleanup-note="cleanup候補:\s*孤立id"/g,
    ""
  );

  html = html.replace(/\n{4,}/g, "\n\n\n");

  repairUndoStack.push(before);
  repairRedoStack = [];

  editor.value = html;
  repairLastValue = html;

  updateLineNumbers();
  updateCursorPosition();
  autoSaveRepairDraft();

  if (typeof updateRepairStatus === "function") {
    updateRepairStatus(
      "コメント化済み候補を完全削除"
    );
  }

  alert(
    "完全削除しました。\n\n" +
    "HTML HEALTH / 編集内容診断で確認してください。"
  );
}

/* ===============================
   Code Block / Function Tools
=============================== */


function toggleFunctionView(index) {

  const el =
    get(
      "functionView" + index
    );

  if (!el) {
    return;
  }

  el.style.display =
    el.style.display === "block"
      ? "none"
      : "block";
}

function openViewerMode() {

  const preview =
    get("repairPreview");

  const viewer =
    get("functionViewer");

  if (!viewer) {
    return;
  }

  // 表示中なら閉じる

  if (
    viewer.style.display === "block"
  ) {

    viewer.style.display =
      "none";

    updateRepairStatus(
      "閲覧モード終了"
    );

    return;
  }

  // 開く

  if (preview) {
    preview.style.display =
      "none";
  }

  renderFunctionViewer();

  viewer.style.display =
    "block";

  updateRepairStatus(
    "閲覧モード：関数ビュー表示"
  );

}

function previewRepairHtml() {

  const box =
    get("repairPreview");

  const btn =
    get("previewBtn");

  if (!box) {
    return;
  }

  if (box.style.display === "block") {

    box.style.display =
      "none";

    if (btn) {
      btn.innerText =
        "🎨 色分けプレビュー";
    }

    return;
  }

  const html =
    get("repairEditor").value;

  if (!html.trim()) {
    alert("HTMLが空です");
    return;
  }

  let escaped =
    escapeHtml(html);

  escaped = escaped
    .replace(
      /(&lt;!--[\s\S]*?--&gt;)/g,
      '<span class="code-comment">$1</span>'
    )
    .replace(
      /(&lt;\/?)([a-zA-Z0-9-]+)/g,
      '$1<span class="code-tag">$2</span>'
    )
    .replace(
      /\s([a-zA-Z-:]+)=/g,
      ' <span class="code-attr">$1</span>='
    )
    .replace(
      /(&quot;.*?&quot;)/g,
      '<span class="code-string">$1</span>'
    )
    .replace(
      /\b(function|const|let|var|return|if|else|try|catch|for|while|switch|case|break|new)\b/g,
      '<span class="code-keyword">$1</span>'
    );

  box.innerHTML =
    escaped;

  box.style.display =
    "block";

  if (btn) {
    btn.innerText =
      "❌ プレビュー閉じる";
  }
}

function saveDeleteRollbackSnapshot(
  label = ""
) {

  const editor =
    get("repairEditor");

  if (!editor) {
    return;
  }

  lastDeleteRollbackHtml =
    editor.value;

  lastDeleteRollbackInfo =
    label;

  localStorage.setItem(
    "lastDeleteRollbackHtml",
    lastDeleteRollbackHtml
  );

  localStorage.setItem(
    "lastDeleteRollbackInfo",
    lastDeleteRollbackInfo
  );

}

async function rollbackLastDelete(skipConfirm = false) {

  const editor =
    get("repairEditor");

  if (!editor) {
    return;
  }

  const backup =
    lastDeleteRollbackHtml ||
    localStorage.getItem(
      "lastDeleteRollbackHtml"
    );

  if (!backup) {
    alert("ロールバックデータなし");
    return;
  }

  if (
    !skipConfirm &&
    !confirm("削除前へ戻しますか？")
  ) {
    return;
  }

  editor.value =
    backup;

  repairLastValue =
    backup;

  if (typeof updateLineNumbers === "function") {
    updateLineNumbers();
  }

  if (typeof updateCursorPosition === "function") {
    updateCursorPosition();
  }

  if (typeof showHtmlHealth === "function") {
    await showHtmlHealth();
  }

  if (typeof updateRepairStatus === "function") {
    updateRepairStatus(
      "ロールバック完了"
    );
  }
}

function moveFunctionPrompt(functionName) {

  const editor =
    get("repairEditor");

  if (!editor) return;

  const sections =
    extractCodeBlocksFromText(editor.value)
      .filter(item =>
        item.type === "section"
      );

  if (sections.length === 0) {
    alert("移動先セクションが見つかりません");
    return;
  }

  const html =
    sections.map(item => {
      return `
<button
  class="float-list-btn"
  onclick="
    moveFunctionToSectionByStart(
      '${functionName}',
      ${item.start}
    );
  ">
  ${escapeHtml(item.name)}
</button>
`;
    }).join("");

  openFloatPanel(
    `移動先を選択：${functionName}`,
    html
  );
}

function moveFunctionToSectionByStart(
  functionName,
  sectionStart
) {

  const editor =
    get("repairEditor");

  if (!editor) return;

  let html =
    editor.value;

  const block =
    findFunctionBlockInText(
      html,
      functionName
    );

  if (!block) {
    alert("関数が見つかりません");
    return;
  }

  const sections =
    extractCodeBlocksFromText(html)
      .filter(item =>
        item.type === "section"
      );

  const target =
    sections.find(item =>
      item.start === sectionStart
    );

  if (!target) {
    alert("移動先セクションが見つかりません");
    return;
  }

  const ok =
    confirm(
      `${functionName}\n\nを\n\n${target.name}\n\nへ移動しますか？`
    );

  if (!ok) return;

  repairUndoStack.push(html);
  repairRedoStack = [];

  html =
    html.slice(0, block.start) +
    html.slice(block.end);

  let insertPos =
    target.end;

  if (block.start < target.end) {
    insertPos =
      target.end -
      (block.end - block.start);
  }

  html =
    html.slice(0, insertPos) +
    "\n\n" +
    block.block +
    "\n" +
    html.slice(insertPos);

  editor.value =
    html;

  repairLastValue =
    html;

  if (typeof updateLineNumbers === "function") {
    updateLineNumbers();
  }

  if (typeof updateCursorPosition === "function") {
    updateCursorPosition();
  }

  if (typeof updateRepairStatus === "function") {
    updateRepairStatus(
      `${functionName} → ${target.name}`
    );
  }

  closeFloatPanel();

  alert("移動完了");
}

/* ===============================
   Code Block Sort
=============================== */

function showFunctionSortList() {

  const editor =
    get("repairEditor");

  const text =
    editor.value;

  if (!text.trim()) {
    alert("HTMLが空です");
    return;
  }

  functionSortList =
    extractCodeBlocksFromText(
      text
    );

  if (
    functionSortList.length === 0
  ) {
    openFloatPanel(
      "コードブロック並べ替え",
      "コードブロックなし"
    );
    return;
  }

  renderFunctionSortList();
}

function renderFunctionSortList() {

  const filteredList =
    getFilteredFunctionSortList();

  const html =
`
<div class="float-panel-actions">

  <button
    onclick="
      setFunctionSortFilter(
        'all'
      )
    ">
    ALL
  </button>

  <button
    onclick="
      setFunctionSortFilter(
        'section'
      )
    ">
    SECTION
  </button>

  <button
    onclick="
      setFunctionSortFilter(
        'variable'
      )
    ">
    VAR
  </button>

  <button
    onclick="
      setFunctionSortFilter(
        'function'
      )
    ">
    FUNC
  </button>

</div>

<div class="float-panel-actions">

  <button
    onclick="
      applyFunctionSortList()
    ">
    ✅ 並べ替えを適用
  </button>

</div>
`
+
filteredList.map(
(entry)=>{

const item =
  entry.item;

const originalIndex =
  entry.index;

return `
<div

  class="
    function-sort-row
  "

  draggable="true"

  data-index="
    ${originalIndex}
  "

  ondragstart="
    handleFunctionSortDragStart(
      event
    )
  "

  ondragover="
    handleFunctionSortDragOver(
      event
    )
  "

  ondrop="
    handleFunctionSortDrop(
      event
    )
  "
>

  <div
    class="
      function-drag-handle
    ">
    ≡
  </div>

  <button

    class="
      float-list-btn
      function-sort-select
    "

    onclick="
      selectCodeBlockByIndex(
        ${originalIndex}
      );

      closeFloatPanelKeepEditorSelection();
    "

  >

    [${item.type}]
    ${originalIndex + 1}.
    ${escapeHtml(
      item.name
    )}

  </button>

  <div
    class="
      function-sort-actions
    ">

    <button
      onclick="
        moveFunctionSortItem(
          ${originalIndex},
          -1
        )
      ">
      ↑
    </button>

    <button
      onclick="
        moveFunctionSortItem(
          ${originalIndex},
          1
        )
      ">
      ↓
    </button>

  </div>

</div>
`;
})
.join("");

  openFloatPanel(
    `コードブロック並べ替え (${functionSortList.length})`,
    html
  );
}

function moveFunctionSortItem(index, direction) {
  const next =
    index + direction;

  if (
    next < 0 ||
    next >= functionSortList.length
  ) {
    return;
  }

  const temp =
    functionSortList[index];

  functionSortList[index] =
    functionSortList[next];

  functionSortList[next] =
    temp;

  renderFunctionSortList();
}

function setFunctionSortFilter(filter) {
  functionSortFilter = filter;
  renderFunctionSortList();
}

function getFilteredFunctionSortList() {
  if (functionSortFilter === "all") {
    return functionSortList.map((item, index) => ({
      item,
      index
    }));
  }

  return functionSortList
    .map((item, index) => ({
      item,
      index
    }))
    .filter(entry =>
      entry.item.type === functionSortFilter
    );
}

let functionSortDragIndex = null;

function handleFunctionSortDragStart(event) {
  functionSortDragIndex =
    Number(
      event.currentTarget.dataset.index
    );
}

function handleFunctionSortDragOver(event) {
  event.preventDefault();
}

function handleFunctionSortDrop(event) {
  event.preventDefault();

  const dropIndex =
    Number(
      event.currentTarget.dataset.index
    );

  if (
    functionSortDragIndex === null ||
    functionSortDragIndex === dropIndex
  ) {
    return;
  }

  const item =
    functionSortList.splice(
      functionSortDragIndex,
      1
    )[0];

  functionSortList.splice(
    dropIndex,
    0,
    item
  );

  functionSortDragIndex = null;

  renderFunctionSortList();
}

function applyFunctionSortList() {

  const editor =
    get("repairEditor");

  if (!editor) return;

  const text =
    editor.value;

  if (!text.trim()) {
    alert("HTMLが空です");
    return;
  }

  const originalBlocks =
    extractCodeBlocksFromText(text);

  if (
    originalBlocks.length !==
    functionSortList.length
  ) {
    alert(
      "コードブロック数が一致しません。\n" +
      "再度一覧を開き直してください。"
    );
    return;
  }

  const ok =
    confirm(
      "現在の並び順をHTMLへ反映します。\n\n" +
      "事前に保存・バックアップ済みですか？"
    );

  if (!ok) return;

  repairUndoStack.push(text);
  repairRedoStack = [];

  let result = "";
  let cursor = 0;

  originalBlocks.forEach((block, index) => {
    result += text.slice(
      cursor,
      block.start
    );

    result +=
      functionSortList[index].block;

    cursor = block.end;
  });

  result += text.slice(cursor);

  editor.value = result;
  repairLastValue = result;

  updateLineNumbers();
  updateCursorPosition();
  updateRepairStatus(
    "コードブロック並べ替え適用"
  );

  autoSaveRepairDraft();

  alert("並べ替えを適用しました");
}

function scrollRepairTop() {

  const editor =
    get("repairEditor");

  if (!editor) {
    return;
  }

  editor.focus();

  editor.scrollTop = 0;

  editor.setSelectionRange(
    0,
    0
  );

  updateCursorPosition();

  updateRepairStatus(
    "最上部へ移動"
  );

}

/* ===============================
   Repair Navigation
=============================== */

function scrollRepairBottom() {

  const editor =
    get("repairEditor");

  if (!editor) {
    return;
  }

  const len =
    editor.value.length;

  editor.focus();

  editor.scrollTop =
    editor.scrollHeight;

  editor.setSelectionRange(
    len,
    len
  );

  updateCursorPosition();

  updateRepairStatus(
    "最下部へ移動"
  );

}

/* ===============================
   Repair Editor Core
=============================== */

function applyRepairIndent(isOutdent) {
  const editor = get("repairEditor");
  if (!editor) return;
  const value = editor.value;
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const indent = "  ";
  repairUndoStack.push(value);
  repairRedoStack = [];
  // 単一カーソルでTabの場合
  if (start === end && !isOutdent) {
    editor.value =
      value.slice(0, start) +
      indent +
      value.slice(end);
    const pos = start + indent.length;
    editor.selectionStart = pos;
    editor.selectionEnd = pos;
  } else {
    const lineStart =
      value.lastIndexOf("\n", start - 1) + 1;
    const before = value.slice(0, lineStart);
    const target = value.slice(lineStart, end);
    const after = value.slice(end);
    const lines = target.split("\n");
    const changed = isOutdent
      ? lines.map(line => {
          if (line.startsWith(indent)) return line.slice(indent.length);
          if (line.startsWith(" ")) return line.slice(1);
          return line;
        }).join("\n")
      : lines.map(line => indent + line).join("\n");
    editor.value = before + changed + after;
    const delta =
      editor.value.length - value.length;
    editor.selectionStart = start;
    editor.selectionEnd = end + delta;
  }
  editor.focus();
  repairLastValue = editor.value;
  updateLineNumbers();
  updateCursorPosition();
  updateRepairStatus(isOutdent ? "アウトデント" : "インデント");
  autoSaveRepairDraft();
}

function indentRepairSelection() {
  applyRepairIndent(false);
}

function outdentRepairSelection() {
  applyRepairIndent(true);
}

function enableRepairEditorTabIndent() {
  const editor = get("repairEditor");
  if (!editor) return;

  editor.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;

    e.preventDefault();

    if (e.shiftKey) {
      outdentRepairSelection();
      return;
    }

    indentRepairSelection();
  });
}

function updateLineNumbers() {

  const editor =
    get("repairEditor");

  const lineBox =
    get("lineNumbers");

  if (!editor || !lineBox) return;

  const currentLine =
    editor.value
      .slice(
        0,
        editor.selectionStart
      )
      .split("\n")
      .length;

  const count =
    editor.value
      .split("\n")
      .length || 1;

  lineBox.innerHTML =
    Array.from(
      { length: count },
      (_, i) => {

        const lineNo =
          i + 1;

        let cls =
          "line-number";

        if (
          lineNo === currentLine
        ){
          cls += " active";
        }

        if (
          lineNo === pinnedLine
        ){
          cls += " pinned";
        }

        return `
<div
  class="${cls}"
  onclick="
    togglePinnedLine(
      ${lineNo}
    )
  "
>
${lineNo}
</div>
`;
      }).join("");
}

function updateRepairStatus(text) {
  const box = get("repairStatus");
  if (!box) return;
  box.innerText = "状態：" + text;
}

function undoRepairEdit() {

  const editor =
    get("repairEditor");

  if (
    !editor ||
    repairUndoStack.length===0
  ) return;

  repairRedoStack.push(
    editor.value
  );

  editor.value =
    repairUndoStack.pop();

  repairLastValue =
    editor.value;

  updateLineNumbers();
  updateCursorPosition();

  autoSaveRepairDraft();

  updateRepairStatus(
    "Undo実行"
  );
}

function redoRepairEdit() {

  const editor =
    get("repairEditor");

  if (
    !editor ||
    repairRedoStack.length===0
  ) return;

  repairUndoStack.push(
    editor.value
  );

  editor.value =
    repairRedoStack.pop();

  repairLastValue =
    editor.value;

  updateLineNumbers();
  updateCursorPosition();

  autoSaveRepairDraft();

  updateRepairStatus(
    "Redo実行"
  );
}

function loadRepairDraft() {
  repairAutoSaveEnabled =
    localStorage.getItem("repairAutoSaveEnabled") === "1";

  currentRepairFile =
    localStorage.getItem("repairCurrentFile") || "";

  updateRepairStatus(
    repairAutoSaveEnabled
      ? "AutoSave ON"
      : "AutoSave OFF"
  );

  const draft = localStorage.getItem("repairDraftHtml");
  if (!draft) return;
  const ok = confirm("修復モードの自動保存データを復元しますか？");
  if (!ok) return;
  get("repairEditor").value = draft;
  repairLastValue = draft;
  updateRepairStatus("自動保存データ復元");
}

function updateCursorPosition() {
  const editor = get("repairEditor");
  const box = get("cursorStatus");
  if (!editor || !box) return;
  const pos = editor.selectionStart || 0;
  const before = editor.value.slice(0, pos);
  const line = before.split("\n").length;
  const col =
    before.length -
    before.lastIndexOf("\n");
  box.innerText =
    `Ln ${line} / Col ${col}`;
  updateLineNumbers();
}

function toggleRepairAutoSave() {
  repairAutoSaveEnabled = !repairAutoSaveEnabled;
  localStorage.setItem(
    "repairAutoSaveEnabled",
    repairAutoSaveEnabled ? "1" : "0"
  );
  updateRepairStatus(
    repairAutoSaveEnabled ? "AutoSave ON" : "AutoSave OFF"
  );
}

function autoSaveRepairDraft() {
  if (!repairAutoSaveEnabled) return;
  const editor = get("repairEditor");
  if (!editor) return;
  localStorage.setItem("repairDraftHtml", editor.value);
  localStorage.setItem(
    "repairDraftSavedAt",
    new Date().toISOString()
  );
}

function togglePinnedLine(
  line
){

  pinnedLine =
    pinnedLine === line
      ? null
      : line;

  updateLineNumbers();
}

function renderFunctionViewer() {

  const box =
    get("functionViewer");

  const editor =
    get("repairEditor");

  if (!box || !editor) {
    return;
  }

  const items =
    extractCodeBlocksFromText(
      editor.value
    );

  box.innerHTML =
    items.length
      ? items.map((f,index)=>`

<div class="function-view-item">

  <div
    class="function-view-line"
    onclick="toggleFunctionView(${index})"
    oncontextmenu="event.preventDefault();selectCodeBlockByStart(${f.start})"
    ontouchstart="this._pressTimer=setTimeout(()=>selectCodeBlockByStart(${f.start}),600)"
    ontouchend="clearTimeout(this._pressTimer)"
    ontouchmove="clearTimeout(this._pressTimer)">

    <span class="function-view-mark">
      ${
        f.type === "section"
          ? "📁"
          : f.type === "variable"
          ? "📌"
          : "▼"
      }
    </span>

    <span class="function-view-name">
      ${escapeHtml(f.name)}
    </span>

  </div>

  <pre
    id="functionView${index}"
    class="function-view-code"
    style="display:none;">${escapeHtml(f.block)}</pre>

</div>

`).join("")
      : "コードブロックなし";
}