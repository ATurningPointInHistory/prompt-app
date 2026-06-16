/* ===============================
   FILE: 08_ai_apply.js
   AI Apply Engine
=============================== */

function showAiIntegrationDiff() {

  if (
    !latestAiIntegrationChanges.length
  ) {
    alert("Diff対象なし");
    return;
  }

  const targets =
    latestAiIntegrationChanges.filter(
      x =>
        x.type === "add" ||
        x.type === "replace"
    );

  if (!targets.length) {
    alert("差分なし");
    return;
  }

  const html =
    targets.map(change => `

<h3>
${escapeHtml(change.name)}
</h3>

<div>
種別:
${escapeHtml(change.type)}
</div>

<div>
リスク:
${escapeHtml(change.risk)}
</div>

<h4>OLD</h4>

<pre class="code-preview">
${escapeHtml(
  change.oldCode || "none"
)}
</pre>

<h4>NEW</h4>

<pre class="code-preview">
${escapeHtml(
  change.newCode || "none"
)}
</pre>

<hr>

`).join("");

  openFloatPanel(
    "AI統合Diff",
    html
  );

}

async function applyAiIntegration() {

  const editor =
    get("repairEditor");

  if (!editor) {
    alert("repairEditorなし");
    return;
  }

  if (
    latestAiAutoTestPassed !== true
  ) {
    alert(
      "先にAutoTestを実行してPASSにしてください"
    );
    return;
  }

  if (
    !latestAiIntegrationChanges ||
    !latestAiIntegrationChanges.length
  ) {
    alert("適用対象なし");
    return;
  }

  if (typeof saveDeleteRollbackSnapshot === "function") {
    saveDeleteRollbackSnapshot(
      "AI統合前"
    );
  }

  let text =
    editor.value;

  let addCount = 0;
  let replaceCount = 0;
  let skipCount = 0;

  latestAiIntegrationChanges.forEach(change => {

    if (change.type === "same") {
      skipCount++;
      return;
    }

    if (change.type === "replace") {

      const block =
        typeof findFunctionBlockInText === "function"
          ? findFunctionBlockInText(
              text,
              change.name
            )
          : null;

      if (!block) {
        skipCount++;
        return;
      }

      text =
        text.slice(0, block.start) +
        change.newCode +
        text.slice(block.end);

      replaceCount++;
      return;
    }

    if (change.type === "add") {

      const exists =
        typeof findFunctionBlockInText === "function"
          ? findFunctionBlockInText(
              text,
              change.name
            )
          : null;

      if (exists) {
        skipCount++;
        return;
      }

      text +=
        "\n\n" +
        change.newCode;

      addCount++;
    }
  });

  editor.value =
    text;

  repairLastValue =
    text;

  const health =
    typeof validateBackupHtml === "function"
      ? validateBackupHtml(text)
      : { js_ok: true, js_error: "" };

  if (!health.js_ok) {

    if (typeof rollbackLastDelete === "function") {
      rollbackLastDelete(true);
    }

    alert(
      "AI統合失敗\n\n" +
      health.js_error
    );

    return;
  }

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
      `AI統合成功 add:${addCount} replace:${replaceCount}`
    );
  }

  if (typeof showHtmlHealth === "function") {
    await showHtmlHealth();
  }

  latestAiIntegrationChanges = [];
  latestAiIntegrationReport = "";
  latestAiAutoTestPassed = false;

  alert(
    [
      "AI統合成功",
      "",
      "追加: " + addCount,
      "更新: " + replaceCount,
      "スキップ: " + skipCount
    ].join("\n")
  );
}

function buildAiIntegrationVirtualText() {

  const editor =
    get("repairEditor");

  if (!editor) {
    return null;
  }

  if (
    !latestAiIntegrationChanges ||
    !latestAiIntegrationChanges.length
  ) {
    return null;
  }

  let text =
    editor.value;

  let addCount = 0;
  let replaceCount = 0;
  let skipCount = 0;

  latestAiIntegrationChanges.forEach(change => {

    if (change.type === "same") {
      skipCount++;
      return;
    }

    if (change.type === "replace") {

      const block =
        findFunctionBlockInText(
          text,
          change.name
        );

      if (!block) {
        skipCount++;
        return;
      }

      text =
        text.slice(0, block.start) +
        change.newCode +
        text.slice(block.end);

      replaceCount++;
      return;
    }

    if (change.type === "add") {

      const exists =
        findFunctionBlockInText(
          text,
          change.name
        );

      if (exists) {
        skipCount++;
        return;
      }

      text +=
        "\n\n" +
        change.newCode;

      addCount++;
    }

  });

  return {
    text,
    addCount,
    replaceCount,
    skipCount
  };
}
