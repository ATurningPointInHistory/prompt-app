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