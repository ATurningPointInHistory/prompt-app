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

function normalizeLoadedHtmlText(text) {
  if (!text) return "";

  let html = String(text);

  // UTF-8 BOM除去
  html = html.replace(/^\uFEFF/, "");

  // 改行コード統一
  html = html
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  return html;
}

function looksLikeHtml(text) {
  if (!text) return false;

  return (
    /<!DOCTYPE html/i.test(text) ||
    /<html[\s>]/i.test(text) ||
    /<head[\s>]/i.test(text) ||
    /<body[\s>]/i.test(text) ||
    /<script[\s>]/i.test(text) ||
    /<style[\s>]/i.test(text)
  );
}

function resetRepairEditorState(html) {
  repairUndoStack = [];
  repairRedoStack = [];
  repairLastValue = html;

  try {
    localStorage.setItem(
      "repairDraftHtml",
      html
    );

    localStorage.setItem(
      "repairDraftSavedAt",
      new Date().toISOString()
    );
  } catch (e) {
    console.warn(
      "repairDraftHtml保存失敗",
      e
    );
  }

  if (typeof updateLineNumbers === "function") {
    updateLineNumbers();
  }

  if (typeof updateCursorPosition === "function") {
    updateCursorPosition();
  }

  if (typeof updateRepairStatus === "function") {
    updateRepairStatus(
      "HTMLを読み込みました"
    );
  }
}

/* ===============================
   Repair File I/O
=============================== */

function loadRepairHtml() {

  const input =
    document.createElement("input");

  input.type = "file";

  input.accept =
    ".html,.htm,.js,.json,.txt," +
    "text/html,text/javascript," +
    "application/json";

  input.onchange = (event) => {

    const file =
      event &&
      event.target &&
      event.target.files &&
      event.target.files[0];

    if (!file) {
      return;
    }

    const maxSize =
      5 * 1024 * 1024;

    if (file.size > maxSize) {

      alert(
        "ファイルサイズが大きすぎます。\n" +
        "5MB以下のファイルを選択してください。"
      );

      return;
    }

    currentRepairFile =
      file.name || "";

    const reader =
      new FileReader();

    reader.onload = () => {

      let text =
        normalizeLoadedHtmlText(
          reader.result
        );

      if (!text.trim()) {

        alert(
          "空のファイルです"
        );

        return;
      }

      // JSONバックアップ対応

      if (
        file.name
          .toLowerCase()
          .endsWith(".json")
      ) {

        try {

          const parsed =
            JSON.parse(text);

          if (
            parsed &&
            typeof parsed.html ===
            "string"
          ) {

            text =
              normalizeLoadedHtmlText(
                parsed.html
              );

            updateRepairStatus(
              "フルバックアップJSON読込: " +
              currentRepairFile
            );

          }

        } catch (e) {

          console.warn(
            "JSON解析失敗",
            e
          );

        }
      }

      const editor =
        get("repairEditor");

      if (!editor) {

        alert(
          "repairEditorが見つかりません"
        );

        return;
      }

      const isHtmlLike =
        looksLikeHtml(text);

      if (!isHtmlLike) {

        const ok =
          confirm(
            "HTMLとして認識しにくい内容です。\n" +
            "そのまま読み込みますか？"
          );

        if (!ok) {
          return;
        }
      }

      editor.value =
        text;

      repairOriginalHtml =
        text;

      editor.scrollTop =
        0;

      editor.scrollLeft =
        0;

      resetRepairEditorState(
        text
      );

      updateLineNumbers();
      updateCursorPosition();

      updateRepairStatus(
        "読込: " +
        currentRepairFile
      );

      alert(
        "読込完了\n\n" +
        currentRepairFile
      );
    };

    reader.onerror = () => {

      alert(
        "ファイルの読み込みに失敗しました"
      );

    };

    reader.readAsText(
      file,
      "UTF-8"
    );
  };

  input.click();
}

function saveRepairHtml() {

  const editor =
    get("repairEditor");

  if (!editor) {
    return;
  }

  const text =
    editor.value.trim();

  if (!text) {

    alert(
      "保存内容が空です"
    );

    return;

  }

  const timestamp =
    new Date()
      .toISOString()
      .replace(/[:.]/g, "-");

  const filename =

    (
      typeof currentRepairFile !==
      "undefined"

      &&

      currentRepairFile
    )

    ? currentRepairFile

    : `AIPro_Repaired_${timestamp}.html`;

  const type =

    filename.endsWith(".js")

      ? "text/javascript"

      : "text/html";

  const blob =
    new Blob(
      [text],
      { type }
    );

  const a =
    document.createElement("a");

  a.href =
    URL.createObjectURL(
      blob
    );

  a.download =
    filename;

  a.click();

  setTimeout(() => {

    URL.revokeObjectURL(
      a.href
    );

  }, 1000);

  repairLastValue =
    editor.value;

  updateRepairStatus(

    `保存完了: ${filename}`

  );

  alert(

    "保存完了\n\n" +

    filename

  );

}

async function copyRepairHtml() {
  const editor =
    get("repairEditor");

  if (!editor) return;

  const html =
    editor.value.trim();

  if (!html) {
    alert("HTMLが空です");
    return;
  }

  try {
    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {
      await navigator.clipboard.writeText(html);
      alert("HTMLコピー完了");
      return;
    }

    const ok =
      copyTextFallback(html);

    alert(
      ok
        ? "HTMLコピー完了"
        : "コピー失敗"
    );

  } catch (e) {
    const ok =
      copyTextFallback(html);

    alert(
      ok
        ? "HTMLコピー完了"
        : "コピー失敗"
    );
  }
}

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
    buildLineDiff(
      repairOriginalHtml,
      editor.value
    );

  const changedRows =
    rows.filter(row =>
      row.type !== "same"
    );

  const html =
    changedRows.length
      ? changedRows.map(row => `
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
`).join("")
      : "差分なし";

  openFloatPanel(
    `Line Diff (${changedRows.length})`,
    `
<div class="float-panel-actions">
<button onclick="showRepairDiff()">
🧩 Function Diff
</button>
</div>

<div class="line-diff-box">
${html}
</div>
`
  );
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

  const filename =
    baseName +
    "_patched_" +
    timestamp +
    ".html";

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

  const onclicks =
    [...html.matchAll(
      /onclick=["']([a-zA-Z0-9_$]+)\(/g
    )].map(x => x[1]);

  const eventRefs =
    [...jsForCheck.matchAll(
      /addEventListener\s*\([^)]*,\s*([a-zA-Z0-9_$]+)/g
    )].map(x => x[1]);

  const windowRefs =
    [...jsForCheck.matchAll(
      /window\.[a-zA-Z0-9_$]+\s*=\s*([a-zA-Z0-9_$]+)/g
    )].map(x => x[1]);

  const labelFors =
    [...html.matchAll(
      /for=["']([^"']+)["']/g
    )].map(x => x[1]);

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

  const safeIgnoreFuncs = [
    "diagnoseRepairHtml",
    "diagnoseHtml",
    "showHtmlHealth",
    "closeFloatPanel",
    "loadSettings",
    "checkSafeMode",
    "cleanupCandidates",
    "commentOutCleanupCandidates",
    "deleteCommentedCleanupBlocks"
  ];

  const unusedFuncs =
    funcs.filter(fn => {

      if (safeIgnoreFuncs.includes(fn)) {
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
        (
          jsForCheck.match(
            new RegExp(
              "\\b" + escapeRegExp(fn) + "\\b",
              "g"
            )
          ) || []
        ).length;

      return count <= 1;
    });

  const safeIgnoreIds = [
    "appPage",
    "repairPage",
    "floatPanel",
    "functionListBox",
    "diffResultBox",
    "diagnoseResultBox",
    "healthResultBox",
    "repairEditor"
  ];

  const orphanIds =
    ids.filter(id => {

      if (!id) {
        return false;
      }

      if (safeIgnoreIds.includes(id)) {
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
          (
            jsForCheck.match(
              new RegExp(
                "\\b" + escapeRegExp(id) + "\\b",
                "g"
              )
            ) || []
          ).length;

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
  if (!ok) return;

  repairUndoStack.push(before);
  repairRedoStack = [];

  functionBlocks.forEach(block => {
    html = html.replace(block, "");
  });

  html = html.replace(
    /\sdata-cleanup-disabled-id="[^"]+"/g,
    ""
  );

  html = html.replace(
    /\sdata-cleanup-note="cleanup候補:\s*孤立id"/g,
    ""
  );

  html = html.replace(/\n{4,}/g, "\n\n\n");

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

function findFunctionBlock(functionName){
  const editor=get("repairEditor");
  const text=editor.value;
  const start=
    text.indexOf(
      `function ${functionName}`
    );
  if(start===-1){
    alert("関数が見つかりません");
    return null;
  }
  const braceStart=
    text.indexOf("{",start);
  let depth=1;
  let end=braceStart+1;
  while(
    end<text.length &&
    depth>0
  ){
    if(text[end]==="{") depth++;
    if(text[end]==="}") depth--;
    end++;
  }
  return{
    start,
    end,
    block:text.slice(start,end)
  };
}

function findFunctionBlockInText(text, functionName) {

  const source =
    String(text || "");

  const name =
    escapeRegExp(functionName);

  const patterns = [
    new RegExp(
      "\\b(?:async\\s+)?function\\s+" +
      name +
      "\\s*\\(",
      "g"
    ),
    new RegExp(
      "\\b(?:const|let|var)\\s+" +
      name +
      "\\s*=\\s*(?:async\\s*)?\\([^)]*\\)\\s*=>\\s*\\{",
      "g"
    ),
    new RegExp(
      "\\b(?:const|let|var)\\s+" +
      name +
      "\\s*=\\s*(?:async\\s*)?[a-zA-Z0-9_$]+\\s*=>\\s*\\{",
      "g"
    ),
    new RegExp(
      "\\b(?:const|let|var)\\s+" +
      name +
      "\\s*=\\s*(?:async\\s+)?function\\s*\\(",
      "g"
    ),
    new RegExp(
      "\\bwindow\\." +
      name +
      "\\s*=\\s*(?:async\\s+)?function\\s*\\(",
      "g"
    )
  ];

  for (const regex of patterns) {
    const match =
      regex.exec(source);

    if (!match) continue;

    const start =
      match.index;

    const braceStart =
      source.indexOf(
        "{",
        regex.lastIndex
      );

    if (braceStart === -1) continue;

    const block =
      findBraceBlockFromPosition(
        source,
        start,
        braceStart
      );

    if (!block) continue;

    return {
      start,
      end: block.end,
      block:
        source.slice(
          start,
          block.end
        )
    };
  }

  return null;
}

function selectFunctionBlock(){
  const name=
    prompt("関数名");
  if(!name)return;
  const result=
    findFunctionBlock(name);
  if(!result)return;
  const editor=
    get("repairEditor");
  editor.focus();
  editor.setSelectionRange(
    result.start,
    result.end
  );
}

function replaceFunctionBlock(){
  const name=
    prompt("置換する関数名");
  if(!name)return;
  const result=
    findFunctionBlock(name);
  if(!result)return;
  const newCode=
    prompt(
      "新コード",
      result.block
    );
  if(newCode===null)return;
  const editor=
    get("repairEditor");
  editor.value=
    editor.value.slice(0,result.start)+
    newCode+
    editor.value.slice(result.end);
  alert("置換完了");
}

function extractFunctionBlocksFromText(text) {
  const source =
    String(text || "");

  const blocks = [];

  const patterns = [
    {
      type: "function",
      regex:
        /(?:^|\n)\s*(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/g
    },
    {
      type: "arrow-function",
      regex:
        /(?:^|\n)\s*(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/g
    },
    {
      type: "arrow-function",
      regex:
        /(?:^|\n)\s*(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?[a-zA-Z0-9_$]+\s*=>\s*\{/g
    },
    {
      type: "function-expression",
      regex:
        /(?:^|\n)\s*(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s+)?function\s*\(/g
    },
    {
      type: "window-function",
      regex:
        /(?:^|\n)\s*window\.([a-zA-Z0-9_$]+)\s*=\s*(?:async\s+)?function\s*\(/g
    }
  ];

  patterns.forEach(pattern => {
    let match;

    pattern.regex.lastIndex = 0;

    while ((match = pattern.regex.exec(source)) !== null) {
      const name =
        match[1];

      const start =
        match[0].startsWith("\n")
          ? match.index + 1
          : match.index;

      const braceStart =
        source.indexOf(
          "{",
          pattern.regex.lastIndex
        );

      if (braceStart === -1) {
        continue;
      }

      const block =
        findBraceBlockFromPosition(
          source,
          start,
          braceStart
        );

      if (!block) {
        continue;
      }

      blocks.push({
        type: pattern.type,
        name,
        start,
        end: block.end,
        block:
          source.slice(
            start,
            block.end
          )
      });
    }
  });

  return blocks
    .filter((item, index, self) =>
      index === self.findIndex(x =>
        x.start === item.start &&
        x.name === item.name
      )
    )
    .sort((a, b) => a.start - b.start);
}

function findBraceBlockFromPosition(source, start, braceStart) {
  let depth = 0;
  let i = braceStart;

  let inString = false;
  let quote = "";
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      i++;
      continue;
    }

    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        inString = false;
        quote = "";
      }
      i++;
      continue;
    }

    if (ch === "/" && next === "/") {
      inLineComment = true;
      i += 2;
      continue;
    }

    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i += 2;
      continue;
    }

    if (
      ch === "\"" ||
      ch === "'" ||
      ch === "`"
    ) {
      inString = true;
      quote = ch;
      i++;
      continue;
    }

    if (ch === "{") {
      depth++;
    }

    if (ch === "}") {
      depth--;

      if (depth === 0) {
        i++;

        if (source[i] === ";") {
          i++;
        }

        return {
          start,
          end: i
        };
      }
    }

    i++;
  }

  return null;
}

function extractCodeBlocksFromText(text) {

  const source =
    String(text || "");

  const blocks = [];

  const functionBlocks =
    extractFunctionBlocksFromText(source);

  // section comment: 複数行見出し
  const sectionRegex =
    /\/\*\s*=+\s*\n([\s\S]*?)\n\s*=+\s*\*\//g;

  [...source.matchAll(sectionRegex)]
    .forEach(match => {

      blocks.push({
        type: "section",
        name:
          match[1]
            .split("\n")
            .map(x => x.trim())
            .filter(Boolean)[0] ||
          "Section",
        start: match.index,
        end:
          match.index +
          match[0].length,
        block: match[0]
      });

    });

  // top-level let const var only
  const variableRegex =
    /^(let|const|var)\s+([a-zA-Z0-9_$]+)/gm;

  [...source.matchAll(variableRegex)]
    .forEach(match => {

      const start =
        match.index;

      const insideFunction =
        functionBlocks.some(fn =>
          start > fn.start &&
          start < fn.end
        );

      if (insideFunction) {
        return;
      }

      const name =
        match[2];

      let end =
        source.indexOf(
          ";",
          start
        );

      if (end === -1) {
        end =
          source.indexOf(
            "\n",
            start
          );
      }

      if (end === -1) {
        end =
          source.length;
      }

      blocks.push({
        type: "variable",
        name,
        start,
        end: end + 1,
        block:
          source.slice(
            start,
            end + 1
          )
      });

    });

  functionBlocks.forEach(item => {

    blocks.push({
      type: "function",
      ...item
    });

  });

  return blocks.sort(
    (a,b)=>
    a.start-b.start
  );
}

/* ===============================
   Code Block List / Move
=============================== */

function showFunctionList() {

  const editor =
    get("repairEditor");

  const text =
    editor.value;

  if (!text.trim()) {
    alert("HTMLが空です");
    return;
  }

  console.log(
    "editor total:",
    text.split(/\r?\n/).length
  );

  console.log(
    "has CR:",
    text.includes("\r")
  );

  const blocks =
    extractCodeBlocksFromText(
      text
    );

  let html = "";

  if (blocks.length === 0) {

    html = "コードブロックなし";

  } else {

    html =
      blocks.map((item, i) => {

        const line =
          text
            .slice(
              0,
              item.start
            )
            .split(/\r?\n/)
            .length;

        console.log(
          `[${item.type}] ${item.name} / L${line}`
        );

        const moveButton =
          item.type === "function"
            ? `
<div class="float-panel-actions">
  <button
    onclick="
      moveFunctionPrompt(
        '${item.name}'
      )
    ">
    📦 Move
  </button>
</div>
`
            : "";

return `

<div class="function-list-row">

  <button
    class="
      float-list-btn
      function-list-select
    "
    onclick="
      selectCodeBlockByIndex(${i});
      closeFloatPanelKeepEditorSelection();
    ">

    [${item.type}]
    ${i + 1}.
    ${escapeHtml(item.name)}
    / L${line}

  </button>

  ${moveButton}

</div>
`;

      }).join("");
  }

  openFloatPanel(
    `コードブロック一覧 (${blocks.length})`,
    `
    <div class="float-panel-actions">
      <button onclick="copyCodeBlockList()">
        📋 一覧コピー
      </button>
    </div>
    ` + html
  );
}

function buildCodeBlockListText() {

  const editor =
    get("repairEditor");

  if (!editor) return "";

  const text =
    editor.value;

  const blocks =
    extractCodeBlocksFromText(text);

  return blocks.map((item, i) => {

    const line =
      text
        .slice(0, item.start)
        .split("\n")
        .length;

    return `[${item.type}] ${i + 1}. ${item.name} / L${line}`;

  }).join("\n");
}

function copyCodeBlockList() {

  const text =
    buildCodeBlockListText();

  if (!text) {
    alert("コピーする一覧がありません");
    return;
  }

  if (
    navigator.clipboard &&
    window.isSecureContext
  ) {
    navigator.clipboard
      .writeText(text)
      .then(() =>
        alert("コードブロック一覧をコピーしました")
      )
      .catch(() => {
        const ok =
          copyTextFallback(text);

        alert(
          ok
            ? "コードブロック一覧をコピーしました"
            : "コピー失敗"
        );
      });

    return;
  }

  const ok =
    copyTextFallback(text);

  alert(
    ok
      ? "コードブロック一覧をコピーしました"
      : "コピー失敗"
  );
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

  updateLineNumbers();
  updateCursorPosition();
  updateRepairStatus(
    `${functionName} → ${target.name}`
  );

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

/* ===============================
   Repair Diagnose / Preview
=============================== */

async function diagnoseRepairHtml() {
  const editor =
    get("repairEditor");

  if (!editor || !editor.value.trim()) {
    alert("修復モードでHTMLを読み込んでから実行してください");
    return;
  }

  const html =
    editor.value;

  const externalJs =
    await collectExternalScriptText(html);

  const jsForCheck =
    html + "\n" + externalJs;

  const scripts =
    getExternalScriptSrcList(html);

  const scriptInfo =
    scripts.length
      ? "✔ external scripts:\n" +
        scripts.join("\n")
      : "✔ external scripts:none";

  const parser =
    new DOMParser();

  const doc =
    parser.parseFromString(
      html,
      "text/html"
    );

  let cleanHtml =
    html
      .replace(
        /<script[\s\S]*?<\/script>/gi,
        ""
      )
      .replace(
        /<style[\s\S]*?<\/style>/gi,
        ""
      );

  const report = [];

  report.push(
    "Repair HTML Diagnose\n"
  );

  // div整合性
  const open =
    (cleanHtml.match(/<div\b/g) || []).length;

  const close =
    (cleanHtml.match(/<\/div>/g) || []).length;

  report.push(
    open === close
      ? `✔ div: ${open}/${close}`
      : `⚠ div: ${open}/${close}`
  );

  // DOM解析
  const parserError =
    doc.querySelector("parsererror");

  report.push(
    parserError
      ? "⚠ DOM解析エラー"
      : "✔ DOM解析OK"
  );

  // id重複
  const ids =
    [...doc.querySelectorAll("[id]")]
      .map(el => el.id)
      .filter(Boolean)
      .filter(id =>
        !id.startsWith("cleanup-")
      );

  const dupIds =
    [...new Set(
      ids.filter(
        (id, i) =>
          ids.indexOf(id) !== i
      )
    )];

  report.push(
    dupIds.length
      ? `⚠ id重複 (${dupIds.length})\n${dupIds.join("\n")}`
      : "✔ id重複なし"
  );

  report.push("");
  report.push(scriptInfo);

  // JS構文
  try {
    const scriptBlocks =
      [...doc.querySelectorAll("script")];

    scriptBlocks.forEach(s => {
      if (s.src) return;

      new Function(
        s.textContent
      );
    });

    report.push(
      "✔ JS構文OK"
    );

  } catch (e) {
    report.push(
      `⚠ JS構文エラー\n${e.message}`
    );
  }

  // コメント除去後にfunction検出
  const htmlForFunctionCheck =
    jsForCheck
      .replace(/\/\/.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");

  const functionBlocks =
    extractFunctionBlocksFromText(
      htmlForFunctionCheck
    );
  
  const funcs =
    functionBlocks.map(item => item.name);
  
  const dupFuncs =
    [...new Set(
      funcs.filter(
        (f, i) =>
          funcs.indexOf(f) !== i
      )
    )];

  report.push(
    dupFuncs.length
      ? `⚠ function重複 (${dupFuncs.length})\n${dupFuncs.join("\n")}`
      : "✔ function重複なし"
  );

  // onclick定義確認
  const onclicks =
    [...html.matchAll(
      /onclick=["']([a-zA-Z0-9_$]+)\(/g
    )]
    .map(x => x[1]);

  const eventRefs =
    [...jsForCheck.matchAll(
      /addEventListener\s*\([^)]*,\s*([a-zA-Z0-9_$]+)/g
    )]
    .map(x => x[1]);

  const windowRefs =
    [...jsForCheck.matchAll(
      /window\.[a-zA-Z0-9_$]+\s*=\s*([a-zA-Z0-9_$]+)/g
    )]
    .map(x => x[1]);

  const labelFors =
    [...html.matchAll(
      /for=["']([^"']+)["']/g
    )]
    .map(x => x[1]);

  const undefinedFns =
    [...new Set(
      onclicks.filter(
        fn =>
          !funcs.includes(fn)
      )
    )];

  report.push(
    undefinedFns.length
      ? `⚠ 未定義onclick (${undefinedFns.length})\n${undefinedFns.join("\n")}`
      : "✔ onclick定義OK"
  );

  // 未使用function
  const safeIgnoreFuncs = [
    "diagnoseRepairHtml",
    "diagnoseHtml",
    "showHtmlHealth",
    "closeFloatPanel",
    "loadSettings",
    "checkSafeMode",
    "cleanupCandidates",
    "commentOutCleanupCandidates",
    "deleteCommentedCleanupBlocks"
  ];

  const unusedFns =
    funcs.filter(fn => {

      if (safeIgnoreFuncs.includes(fn)) {
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

      const useCount =
        (
          jsForCheck.match(
            new RegExp(
              "\\b" + escapeRegExp(fn) + "\\b",
              "g"
            )
          ) || []
        ).length;

      return useCount <= 1;
    });

  report.push(
    unusedFns.length
      ? `⚠ 未使用function (${unusedFns.length})\n${
          unusedFns
            .slice(0, 15)
            .join("\n")
        }`
      : "✔ 未使用functionなし"
  );

  // 孤立id
  const safeIgnoreIds = [
    "appPage",
    "repairPage",
    "floatPanel",
    "functionListBox",
    "diffResultBox",
    "diagnoseResultBox",
    "healthResultBox",
    "repairEditor"
  ];

  const orphanIds =
    ids.filter(id => {

      if (!id) {
        return false;
      }

      if (safeIgnoreIds.includes(id)) {
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
        const useCount =
          (
            jsForCheck.match(
              new RegExp(
                "\\b" +
                escapeRegExp(id) +
                "\\b",
                "g"
              )
            ) || []
          ).length;

        return useCount <= 1;

      } catch {
        return false;
      }
    });

  report.push(
    orphanIds.length
      ? `⚠ 孤立id (${orphanIds.length})\n${
          orphanIds
            .slice(0, 15)
            .join("\n")
        }`
      : "✔ 孤立idなし"
  );

  const result =
    report.join("\n");

  window.latestDiagnoseResult =
    result;

  openFloatPanel(
    "編集内容診断",
    `
    <div class="float-panel-actions">
      <button onclick="copyDiagnoseResult()">
        📋 コピー
      </button>
    </div>
    <pre
      id="diagnoseResultBox"
      class="code-preview">
${escapeHtml(result)}
    </pre>
    `
  );
}

function copyDiagnoseResult() {
  const text =
    window.latestDiagnoseResult || "";
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
      .then(() =>
        alert("コピー完了")
      )
      .catch(() => {
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

function selectCodeBlockByStart(start) {

  const editor =
    get("repairEditor");

  if (!editor) {
    return;
  }

  editor.focus();

  editor.setSelectionRange(
    start,
    start
  );

  const line =
    editor.value
      .slice(0,start)
      .split("\n")
      .length;

  editor.scrollTop =
    Math.max(
      0,
      (line - 3) * 18
    );

  updateCursorPosition();

}

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