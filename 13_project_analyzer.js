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

function extractModuleKeywords(code) {

  const names =
    extractFunctionNames(code);

  const words =
    new Set();

  names.forEach(name => {

    String(name)
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .split(/[^a-zA-Z0-9]+/)
      .forEach(word => {

        word =
          word
            .trim()
            .toLowerCase();

        if (
          word.length >= 3
        ) {
          words.add(word);
        }

      });

  });

  return [...words].sort();

}

function buildModuleAnalysis(
  code,
  fileName = ""
) {

  const blocks =
    extractFunctionBlocksFromText(
      code
    );

  const result =
    splitTopLevelFunctions(
      blocks
    );

  const topLevel =
    result.topLevel;

  const nested =
    result.nested;

  const keywords =
    extractModuleKeywords(code);

  const lines = [];

  lines.push("MODULE ANALYSIS");
  lines.push("");

  lines.push("=== File ===");
  lines.push(fileName || "unknown");
  lines.push("");

  lines.push("=== Function Count ===");
  lines.push(
    String(
      topLevel.length +
      nested.length
    )
  );
  lines.push("");

  lines.push("=== Top Level Count ===");
  lines.push(String(topLevel.length));
  lines.push("");

  lines.push("=== Nested Count ===");
  lines.push(String(nested.length));
  lines.push("");

  lines.push("=== Keywords ===");
  lines.push(
    keywords.length
      ? keywords.join(", ")
      : "none"
  );
  lines.push("");

  lines.push("=== Top Level Functions ===");

  lines.push(
    topLevel.length
      ? topLevel.map(block => block.name).join("\n")
      : "none"
  );

  lines.push("");

  lines.push("=== Nested Functions ===");

  lines.push(
    nested.length
      ? nested.map(block => block.name).join("\n")
      : "none"
  );

  return lines.join("\n");

}

function generateModuleAnalyzer() {

  const editor =
    get("repairEditor");

  if (
    !editor ||
    !editor.value.trim()
  ) {

    alert(
      "Repair Editorへ読み込んでください"
    );

    return;

  }

  const report =
    buildModuleAnalysis(
      editor.value,
      currentRepairFile
    );

  openFloatPanel(

    "📊 Module Analyzer",

    `
<div class="float-panel-actions">

<button
onclick="copyModuleAnalysis()">
📋 コピー
</button>

</div>

<pre class="code-preview">
${escapeHtml(report)}
</pre>

`

  );

  latestModuleAnalysis =
    report;

}

let latestModuleAnalysis =
  "";

function copyModuleAnalysis() {

  if (
    !latestModuleAnalysis
  ) {

    alert("解析結果なし");

    return;

  }

  const ok =
    copyTextFallback(
      latestModuleAnalysis
    );

  alert(
    ok
      ? "Module Analysisをコピーしました"
      : "コピー失敗"
  );

}

function extractCalledFunctionsFromBlocks(
  blocks
) {

  const calls =
    new Set();

  blocks.forEach(block => {

    const list =
      extractCalledFunctions(
        block.code ||
        ""
      );

    list.forEach(name => {

      calls.add(name);

    });

  });

  return [...calls].sort();

}

window.generateModuleRulesFromLoadedScripts =
  generateModuleRulesFromLoadedScripts;

window.copyGeneratedModuleRule =
  copyGeneratedModuleRule;

window.generateModuleAnalyzer =
  generateModuleAnalyzer;

window.copyModuleAnalysis =
  copyModuleAnalysis;

console.log(
  "13_project_analyzer loaded"
);