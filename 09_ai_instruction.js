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

  const targets =
    extractAiInstructionTargets(
      text
    );

  const lines = [];

  lines.push(
    "AI Instruction Report"
  );

  lines.push("");

  lines.push(
    "=== Function Candidates ==="
  );

  lines.push("");

  lines.push(
    targets.length
      ? targets.join("\n")
      : "none"
  );

  lines.push("");

  lines.push(
    "=== Suggested Search ==="
  );

  lines.push("");

  targets.forEach(name => {

    const block =
      findFunctionBlockInText(
        get("repairEditor")
          ?.value || "",
        name
      );

    if (!block) {

      lines.push(
        `${name} : not found`
      );

      return;

    }

    const line =
      get("repairEditor")
        .value
        .slice(
          0,
          block.start
        )
        .split("\n")
        .length;

    lines.push(
      `${name} : L${line}`
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

window.analyzeAiInstruction =
  analyzeAiInstruction;

window.runAiInstructionAnalysis =
  runAiInstructionAnalysis;

window.copyAiInstructionReport =
  copyAiInstructionReport;