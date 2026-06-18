/* ===============================
   FILE: 13_project_analyzer.js
   Project Analyzer
=============================== */

function generateModuleRulesFromLoadedScripts() {

  const editor =
    get("repairEditor");

  if (!editor || !editor.value.trim()) {
    alert("先にJSまたはHTMLをRepair Editorへ読み込んでください");
    return;
  }

  const text =
    editor.value;

  const blocks =
    extractCodeBlocksFromText(text)
      .filter(block =>
        block.type === "function"
      );

  const functionNames =
    blocks.map(block =>
      block.name
    );

  const words =
    [
      ...new Set(
        functionNames
          .flatMap(name =>
            String(name)
              .replace(/([A-Z])/g, " $1")
              .toLowerCase()
              .split(/[^a-z0-9_]+/)
          )
          .filter(word =>
            word &&
            word.length >= 3
          )
      )
    ].slice(0, 20);

  const fileName =
    currentRepairFile ||
    "unknown.js";

  const rule = {
    file: fileName,
    priority: 90,
    words
  };

  const output =
    JSON.stringify(
      rule,
      null,
      2
    );

  openFloatPanel(
    "📊 Module Rule Generator",
    `
<div class="float-panel-actions">

<button onclick="copyGeneratedModuleRule()">
📋 コピー
</button>

</div>

<textarea
id="generatedModuleRuleOutput"
rows="18"
style="
width:100%;
height:60vh;
font-family:monospace;
font-size:11px;
white-space:pre;
overflow:auto;
resize:vertical;
"
>${escapeHtml(output)}</textarea>
`
  );

}

function copyGeneratedModuleRule() {

  const box =
    get("generatedModuleRuleOutput");

  if (!box || !box.value) {
    alert("コピー内容なし");
    return;
  }

  const ok =
    copyTextFallback(
      box.value
    );

  alert(
    ok
      ? "Module Ruleをコピーしました"
      : "コピー失敗"
  );

}

window.generateModuleRulesFromLoadedScripts =
  generateModuleRulesFromLoadedScripts;

window.copyGeneratedModuleRule =
  copyGeneratedModuleRule;
