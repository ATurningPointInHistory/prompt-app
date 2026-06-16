/* ===============================
   FILE: 05_repair_diff.js
   Repair Diff / Patch
=============================== */

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

  input.type =
    "file";

  input.accept =
    ".json,application/json";

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

        const editor =
          get("repairEditor");

        if (!editor) {
          alert("repairEditorが見つかりません");
          return;
        }

        const baseHtml =
          repairOriginalHtml ||
          editor.value;

        const patched =
          applyRepairDiff(
            baseHtml,
            diff
          );

        if (!patched) return;

        repairUndoStack.push(
          editor.value
        );

        repairRedoStack = [];

        editor.value =
          patched;

        repairLastValue =
          patched;

        if (typeof updateLineNumbers === "function") {
          updateLineNumbers();
        }

        if (typeof updateCursorPosition === "function") {
          updateCursorPosition();
        }

        if (typeof autoSaveRepairDraft === "function") {
          autoSaveRepairDraft();
        }

        if (typeof updateRepairStatus === "function") {
          updateRepairStatus(
            "Diff適用: " + file.name
          );
        }

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