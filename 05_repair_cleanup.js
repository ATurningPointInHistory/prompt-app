/* ===============================
   FILE: 05_repair_cleanup.js
   Repair Cleanup Tools
=============================== */

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

  const editor =
    get("repairEditor");

  if (!editor || !editor.value.trim()) {
    alert("修復モードでHTMLを読み込んでから実行してください");
    return;
  }

  let html =
    editor.value;

  repairUndoStack.push(html);
  repairRedoStack = [];

  unusedFuncs.forEach(fn => {

    const block =
      findFunctionBlockInText(
        html,
        fn
      );

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

    const reg =
      new RegExp(
        `\\s+id=(["'])${escapeRegExp(id)}\\1`,
        "g"
      );

    html =
      html.replace(reg, match => {

        if (match.includes("cleanup-disabled-id")) {
          return match;
        }

        return (
          ` data-cleanup-disabled-id="${id}"` +
          ` data-cleanup-note="cleanup候補: 孤立id"`
        );
      });
  });

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

  if (typeof autoSaveRepairDraft === "function") {
    autoSaveRepairDraft();
  }

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

  const editor =
    get("repairEditor");

  if (!editor || !editor.value.trim()) {
    alert("修復モードでHTMLを読み込んでから実行してください");
    return;
  }

  let html =
    editor.value;

  const before =
    html;

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

  const ok =
    confirm(message);

  if (!ok) {
    return;
  }

  html =
    html.replace(
      cleanupBlockRegex,
      ""
    );

  html =
    html.replace(
      /\sdata-cleanup-disabled-id="[^"]+"/g,
      ""
    );

  html =
    html.replace(
      /\sdata-cleanup-note="cleanup候補:\s*孤立id"/g,
      ""
    );

  html =
    html.replace(/\n{4,}/g, "\n\n\n");

  repairUndoStack.push(before);
  repairRedoStack = [];

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

  if (typeof autoSaveRepairDraft === "function") {
    autoSaveRepairDraft();
  }

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