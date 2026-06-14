/* ===============================
   FILE: 09_ai_instruction.js
   AI Instruction Analyzer
=============================== */

let latestAiInstructionReport = "";

function analyzeAiInstruction() {

  openFloatPanel(
    "AI指示解析",
    `
<textarea
id="aiInstructionInput"
rows="12"
placeholder="ChatGPTの修正指示を貼り付け"
style="
width:100%;
height:250px;
"></textarea>

<div class="float-panel-actions">

<button
onclick="runAiInstructionAnalysis()">
解析
</button>

</div>
`
  );

}

function runAiInstructionAnalysis() {

  const input =
    get("aiInstructionInput");

  if (
    !input ||
    !input.value.trim()
  ) {
    alert("指示を入力してください");
    return;
  }

  const report =
    buildAiInstructionReport(
      input.value
    );

  latestAiInstructionReport =
    report;

  openFloatPanel(
    "AI指示解析結果",
    `
<div class="float-panel-actions">

<button
onclick="copyAiInstructionReport()">
📋 コピー
</button>

</div>

<pre class="code-preview">
${escapeHtml(report)}
</pre>
`
  );

}

function extractAiInstructionTargets(
  text
) {

  const targets =
    new Set();

  const patterns = [

    /function\s+([a-zA-Z_$][\w$]*)/g,

    /([a-zA-Z_$][\w$]*)\s*\(\)/g

  ];

  patterns.forEach(pattern => {

    let match;

    while (
      (match =
        pattern.exec(text))
    ) {

      targets.add(
        match[1]
      );

    }

  });

  return [...targets];

}

function buildAiInstructionReport(
  text
) {

  const changeData =
    extractAiBeforeAfter(
      text
    );

  const primaryTarget =
    extractPrimaryAiTarget(
      text
    );

  const replaceCandidate =
    buildAiReplaceCandidate(
      primaryTarget,
      changeData.before,
      changeData.after
    );

  const targets =
    extractAiInstructionTargets(
      text
    );

  const editor =
    get("repairEditor");

  const editorText =
    editor && editor.value
      ? editor.value
      : "";

  const pageText =
    document.documentElement
      ? document.documentElement.outerHTML
      : "";

  const searchText =
    editorText.trim()
      ? editorText
      : pageText;

  const sourceLabel =
    editorText.trim()
      ? "repairEditor"
      : "document";

  const lines = [];

  lines.push(
    "AI Instruction Report"
  );

  lines.push("");

  lines.push(
    "=== Source ==="
  );

  lines.push("");

  lines.push(
    sourceLabel
  );

  lines.push("");

  lines.push(
  "=== Target Function ==="
  );

  lines.push("");

  lines.push(
    primaryTarget || "none"
  );

  lines.push("");

  lines.push(
    "=== Related Functions ==="
  );

  lines.push("");

  const related =
    targets.filter(
      name =>
        name !== primaryTarget
    );

  lines.push(
    related.length
      ? related.join("\n")
      : "none"
  );

  lines.push("");

  lines.push(
    "=== Change Before ==="
  );

  lines.push("");

  lines.push(
    changeData.before ||
    "none"
  );

  lines.push("");

  lines.push(
    "=== Change After ==="
  );

  lines.push("");

  lines.push(
    changeData.after ||
    "none"
  );

  lines.push("");

  if (replaceCandidate) {

    lines.push(
      "=== Replace Candidate ==="
    );

    lines.push("");

    lines.push(
      "Target : " +
      replaceCandidate.functionName
    );

  lines.push("");

  lines.push(
    replaceCandidate.found
      ? "FOUND"
      : "NOT FOUND"
  );

  lines.push("");

}

  lines.push(
    "=== Suggested Search ==="
  );

  lines.push("");

  targets.forEach(name => {

    const block =
      findFunctionBlockInText(
        searchText,
        name
      );

    if (!block) {

      lines.push(
        `${name} : not found`
      );

      return;

    }

    const line =
      searchText
        .slice(
          0,
          block.start
        )
        .split("\n")
        .length;

    lines.push(
      `${name} : ${sourceLabel} / L${line}`
    );

  });

  return lines.join("\n");

}

function copyAiInstructionReport() {

  if (
    !latestAiInstructionReport
  ) {
    return;
  }

  copyTextFallback(
    latestAiInstructionReport
  );

}

function extractPrimaryAiTarget(
  text
) {

  const patterns = [

    /([a-zA-Z_$][\w$]*)\s*\(\)\s*を修正/g,

    /function\s+([a-zA-Z_$][\w$]*)/g

  ];

  for (const pattern of patterns) {

    const match =
      pattern.exec(text);

    if (
      match &&
      match[1]
    ) {
      return match[1];
    }

  }

  return "";

}

function extractAiBeforeAfter(
  text
) {

  const beforeMatch =
    text.match(
      /変更前([\s\S]*?)変更後/i
    );

  const afterMatch =
    text.match(
      /変更後([\s\S]*)/i
    );

  return {

    before:
      beforeMatch
        ? beforeMatch[1].trim()
        : "",

    after:
      afterMatch
        ? afterMatch[1].trim()
        : ""

  };

}

function buildAiReplaceCandidate(
  targetFunction,
  beforeText,
  afterText
) {

  const editor =
    get("repairEditor");

  if (
    !editor ||
    !editor.value
  ) {
    return null;
  }

  const block =
    findFunctionBlockInText(
      editor.value,
      targetFunction
    );

  if (!block) {
    return null;
  }

  return {
    functionName:
      targetFunction,

    found:
      block.block.includes(
        beforeText
      ),

    before:
      beforeText,

    after:
      afterText
  };

}

window.analyzeAiInstruction =
  analyzeAiInstruction;

window.runAiInstructionAnalysis =
  runAiInstructionAnalysis;

window.copyAiInstructionReport =
  copyAiInstructionReport;
