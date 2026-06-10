/* ===============================
   Function Relation Map
=============================== */

function showFunctionRelationMap() {

  const editor =
    get("repairEditor");

  const text =
    editor && editor.value.trim()
      ? editor.value
      : document.documentElement.outerHTML;

  const blocks =
    extractCodeBlocksFromText(text);

  if (!blocks.length) {
    alert("関数が見つかりません");
    return;
  }

  const names =
    blocks.map(
      block => block.name
    );

  const tree = [];

  tree.push(
    "Function Relation Map"
  );

  tree.push("");

  blocks.forEach(block => {

    const calls =
      names.filter(name => {

        if (name === block.name) {
          return false;
        }

        return new RegExp(
          "\\b" +
          escapeRegExp(name) +
          "\\s*\\(",
          "g"
        ).test(block.block);

      });

    tree.push(block.name);

    if (!calls.length) {

      tree.push(
        "└─ none"
      );

    } else {

      calls.forEach(
        (call, index) => {

          const last =
            index ===
            calls.length - 1;

          tree.push(
            (last
              ? "└─ "
              : "├─ ") +
            call
          );

        }
      );

    }

    tree.push("");

  });

  const result =
    tree.join("\n");

  window.latestFunctionRelationMap =
    result;

  openFloatPanel(
    "🌳 関数関連図",
    `
<div class="float-panel-actions">
<button
onclick="copyFunctionRelationMap()">
📋 コピー
</button>
</div>

<pre class="code-preview">
${escapeHtml(result)}
</pre>
`
  );
}

function copyFunctionRelationMap() {

  const text =
    window.latestFunctionRelationMap || "";

  if (!text) {
    alert("コピー内容なし");
    return;
  }

  const ok =
    copyTextFallback(text);

  alert(
    ok
      ? "関数関連図をコピーしました"
      : "コピー失敗"
  );
}