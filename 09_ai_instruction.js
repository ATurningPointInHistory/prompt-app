/* ===============================
   FILE: 09_ai_instruction.js
   AI Instruction Analyzer
=============================== */

let latestAiInstructionJson = "";

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

  const json =
    buildAiInstructionJson(
      input.value
    );
  
  latestAiInstructionJson =
    json;

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

<button
onclick="copyAiInstructionJson()">
📦 JSON
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

  const source =
    String(text || "");

  const targets =
    new Set();

  const patterns = [

    // function test()
    /function\s+([a-zA-Z_$][\w$]*)/g,

    // test()
    /([a-zA-Z_$][\w$]*)\s*\(\)/g,

    // testを修正
    /([a-zA-Z_$][\w$]*)\s*を(?:修正|変更|改善|追加|削除)/g,

    // test に追加
    /([a-zA-Z_$][\w$]*)\s*に(?:追加|実装)/g,

    // test の修正
    /([a-zA-Z_$][\w$]*)\s*の(?:修正|変更|改善)/g

  ];

  patterns.forEach(pattern => {

    pattern.lastIndex = 0;

    let match;

    while (
      (match =
        pattern.exec(source))
    ) {

      const name =
        match[1];

      if (
        !name ||
        name.length < 2
      ) {
        continue;
      }

      targets.add(name);

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

  const targetBlock =
    primaryTarget
      ? findFunctionBlockInText(
          searchText,
          primaryTarget
        )
      : null;

  const replaceCandidate =
    buildAiReplaceCandidate(
      primaryTarget,
      changeData.before,
      changeData.after
    );

  const matchScore =
    buildAiMatchScore(
      targetBlock,
      changeData.before,
      changeData.after
    );

  const riskLevel =
    buildAiRiskLevel(
      primaryTarget,
      changeData.before,
      changeData.after
    );

  const fileCandidate =
    guessAiTargetFile(
      primaryTarget
    );

  const lines = [];

  lines.push("AI Instruction Report v2");
  lines.push("");

  lines.push("=== Source ===");
  lines.push("");
  lines.push(sourceLabel);
  lines.push("");

  lines.push("=== Target Function ===");
  lines.push("");
  lines.push(primaryTarget || "none");
  lines.push("");

  lines.push("=== File Candidate ===");
  lines.push("");
  lines.push(fileCandidate);
  lines.push("");

  lines.push("=== Match Score ===");
  lines.push("");
  lines.push(String(matchScore));
  lines.push("");

  lines.push("=== Risk Level ===");
  lines.push("");
  lines.push(riskLevel);
  lines.push("");

  lines.push("=== Related Functions ===");
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

  lines.push("=== Change Before ===");
  lines.push("");
  lines.push(
    changeData.before ||
    "none"
  );
  lines.push("");

  lines.push("=== Change After ===");
  lines.push("");
  lines.push(
    changeData.after ||
    "none"
  );
  lines.push("");

  lines.push("=== Replace Candidate ===");
  lines.push("");

  if (replaceCandidate) {

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
    
    lines.push(
      "exact : " +
      (
        replaceCandidate.foundExact
          ? "YES"
          : "NO"
      )
    );
    
    lines.push(
      "loose : " +
      (
        replaceCandidate.foundLoose
          ? "YES"
          : "NO"
      )
    );

  } else {

    lines.push("none");

  }

  lines.push("");

  lines.push("=== Suggested Search ===");
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
        .split(/\r?\n/)
        .length;

    lines.push(
      `${name} : ${sourceLabel} / L${line}`
    );

  });

  lines.push("");

  lines.push("=== Suggested Action ===");
  lines.push("");

  if (
    riskLevel === "HIGH"
  ) {
    lines.push(
      "manual review required"
    );
  } else if (
    replaceCandidate &&
    replaceCandidate.found
  ) {
    lines.push(
      "replace candidate available"
    );
  } else {
    lines.push(
      "search and inspect manually"
    );
  }

  return lines.join("\n");

}

function guessAiTargetFile(
  functionName
) {

  const name =
    String(functionName || "");

  const rules = [
    {
      file: "08_function_relation.js",
      keywords: [
        "FunctionRelation",
        "RelationMap",
        "jumpToLine"
      ]
    },
    {
      file: "08_ai_analyzer.js",
      keywords: [
        "AiInstruction",
        "AiTarget",
        "AiBeforeAfter",
        "AiReplaceCandidate"
      ]
    },
    {
      file: "08_ai_apply.js",
      keywords: [
        "AiApply",
        "Apply",
        "Replace"
      ]
    },
    {
      file: "08_ai_test.js",
      keywords: [
        "AiTest",
        "TestRunner",
        "Test"
      ]
    },
    {
      file: "07_health_dependency.js",
      keywords: [
        "Dependency",
        "FunctionDependency"
      ]
    },
    {
      file: "07_health_diagnose.js",
      keywords: [
        "Health",
        "Diagnose",
        "HtmlHealth"
      ]
    },
    {
      file: "07_health_unused.js",
      keywords: [
        "Unused",
        "Cleanup"
      ]
    },
    {
      file: "07_backup_manager.js",
      keywords: [
        "Backup",
        "Restore"
      ]
    },
    {
      file: "07_safe_mode.js",
      keywords: [
        "SafeMode",
        "Emergency"
      ]
    }
  ];

  for (const rule of rules) {

    if (
      rule.keywords.some(keyword =>
        name.includes(keyword)
      )
    ) {
      return rule.file;
    }

  }

  return "unknown";
}

function buildAiMatchScore(
  block,
  beforeText,
  afterText
) {

  if (!block) {
    return 0;
  }

  let score = 40;

  if (
    beforeText &&
    block.block.includes(beforeText)
  ) {
    score += 40;
  }

  if (
    afterText &&
    block.block.includes(afterText)
  ) {
    score += 10;
  }

  if (
    block.block.length > 50
  ) {
    score += 10;
  }

  return Math.min(
    100,
    score
  );
}

function buildAiRiskLevel(
  targetFunction,
  beforeText,
  afterText
) {

  const text =
    [
      targetFunction,
      beforeText,
      afterText
    ].join("\n");

  const highRiskWords = [
    "localStorage.clear",
    "innerHTML",
    "eval",
    "new Function",
    "document.write",
    "delete",
    "removeItem",
    "replace("
  ];

  const hit =
    highRiskWords.some(word =>
      text.includes(word)
    );

  if (hit) {
    return "HIGH";
  }

  if (
    !beforeText ||
    !afterText
  ) {
    return "MEDIUM";
  }

  return "LOW";
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

  const source =
    String(text || "");

  const patterns = [

    /([a-zA-Z_$][\w$]*)\s*\(\)\s*を(?:修正|変更|改善|追加|削除|強化)/,

    /([a-zA-Z_$][\w$]*)\s*を(?:修正|変更|改善|追加|削除|強化)/,

    /([a-zA-Z_$][\w$]*)\s*の(?:修正|変更|改善|追加|削除|強化)/,

    /function\s+([a-zA-Z_$][\w$]*)/

  ];

  for (const pattern of patterns) {

    const match =
      pattern.exec(source);

    if (
      match &&
      match[1]
    ) {
      return match[1];
    }

  }

  const targets =
    extractAiInstructionTargets(
      source
    );

  return targets.length
    ? targets[0]
    : "";

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
    !editor.value ||
    !targetFunction
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

  const rawBefore =
    String(beforeText || "");

  const rawAfter =
    String(afterText || "");

  const normalize =
    value =>
      String(value || "")
        .replace(/\s+/g, "");

  const foundExact =
    rawBefore
      ? block.block.includes(rawBefore)
      : false;

  const foundLoose =
    rawBefore
      ? normalize(block.block).includes(
          normalize(rawBefore)
        )
      : false;

  return {
    functionName:
      targetFunction,

    found:
      foundExact || foundLoose,

    foundExact,

    foundLoose,

    before:
      rawBefore,

    after:
      rawAfter
  };

}

function buildAiInstructionJson(
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

  const targets =
    extractAiInstructionTargets(
      text
    );

  const fileCandidate =
    guessAiTargetFile(
      primaryTarget
    );

  const riskLevel =
    buildAiRiskLevel(
      primaryTarget,
      changeData.before,
      changeData.after
    );

  return JSON.stringify(
    {

      version: 1,

      targetFunction:
        primaryTarget,

      relatedFunctions:
        targets.filter(
          x =>
            x !== primaryTarget
        ),

      fileCandidate,

      riskLevel,

      before:
        changeData.before,

      after:
        changeData.after,

      timestamp:
        new Date()
          .toISOString()

    },

    null,
    2
  );

}

function copyAiInstructionJson() {

  if (
    !latestAiInstructionJson
  ) {
    return;
  }

  copyTextFallback(
    latestAiInstructionJson
  );

}

window.analyzeAiInstruction =
  analyzeAiInstruction;

window.runAiInstructionAnalysis =
  runAiInstructionAnalysis;

window.copyAiInstructionReport =
  copyAiInstructionReport;