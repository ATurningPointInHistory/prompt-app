/* ===============================
   FILE: 08_ai_integrator.js
   Function Relation Map
=============================== */

/* ===============================
   relation_map
=============================== */

let latestAiAutoTestPassed = false;

let latestAiAutoTestReport = "";

let functionRelationData = [];

function showFunctionRelationMap() {

  const editor =
    get("repairEditor");

  const text =
    editor && editor.value.trim()
      ? editor.value
      : document.documentElement.outerHTML;

  const blocks =
    extractCodeBlocksFromText(text)
      .filter(block =>
        block.type === "function"
      );

  if (!blocks.length) {
    alert("関数が見つかりません");
    return;
  }

  const names =
    blocks.map(block => block.name);

  functionRelationData =
    blocks.map(block => {

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

      const calledBy =
        blocks
          .filter(other => {

            if (other.name === block.name) {
              return false;
            }

            return new RegExp(
              "\\b" +
              escapeRegExp(block.name) +
              "\\s*\\(",
              "g"
            ).test(other.block);
          })
          .map(other => other.name);

      return {
        name: block.name,
        calls,
        calledBy,
        line:
          text
            .slice(0, block.start)
            .split("\n")
            .length
      };
    });

  renderFunctionRelationMap();
}

function renderFunctionRelationMap() {

  const html =
    functionRelationData
      .map((item, index) => {

        return `
<div class="relation-row">

  <button
    class="float-list-btn"
    onclick="toggleFunctionRelationDetail(${index})">
    ▶ ${escapeHtml(item.name)}
    <br>
    <span class="small">
      calls:${item.calls.length}
      / calledBy:${item.calledBy.length}
      / L${item.line}
    </span>
  </button>

  <div
    id="relationDetail${index}"
    class="relation-detail"
    style="display:none;">

    <b>呼び出している関数</b>
    <pre class="code-preview">${
      escapeHtml(
        item.calls.length
          ? item.calls.join("\n")
          : "none"
      )
    }</pre>

    <b>呼び出し元</b>
    <pre class="code-preview">${
      escapeHtml(
        item.calledBy.length
          ? item.calledBy.join("\n")
          : "none"
      )
    }</pre>

  </div>

</div>
`;
      })
      .join("");

  openFloatPanel(
    "🌳 関数関連図",
    `
<div class="float-panel-actions">
  <button onclick="expandAllFunctionRelations()">
    全展開
  </button>

  <button onclick="collapseAllFunctionRelations()">
    全閉
  </button>

  <button onclick="copyFunctionRelationMap()">
    コピー
  </button>
</div>

${html}
`
  );
}

function toggleFunctionRelationDetail(index) {

  const box =
    get("relationDetail" + index);

  if (!box) return;

  box.style.display =
    box.style.display === "none"
      ? "block"
      : "none";
}

function expandAllFunctionRelations() {
  document
    .querySelectorAll(".relation-detail")
    .forEach(el => {
      el.style.display = "block";
    });
}

function collapseAllFunctionRelations() {
  document
    .querySelectorAll(".relation-detail")
    .forEach(el => {
      el.style.display = "none";
    });
}

function copyFunctionRelationMap() {

  if (!functionRelationData.length) {
    alert("コピー内容なし");
    return;
  }

  const text =
    functionRelationData
      .map(item => {

        return `${item.name}
  calls:
${
  item.calls.length
    ? item.calls.map(x => "    - " + x).join("\n")
    : "    - none"
}

  calledBy:
${
  item.calledBy.length
    ? item.calledBy.map(x => "    - " + x).join("\n")
    : "    - none"
}
`;

      })
      .join("\n----------------\n");

  const ok =
    copyTextFallback(text);

  alert(
    ok
      ? "関数関連図をコピーしました"
      : "コピー失敗"
  );
}

/* ===============================
   ai_integrator
=============================== */

let latestAiIntegrationReport = "";
let latestAiIntegrationChanges = [];

function analyzeAiGeneratedCode() {

  openFloatPanel(
    "AIコード解析",
    `
<textarea
  id="aiCodeInput"
  rows="10"
  placeholder="AIが出力したfunctionコードを貼り付け"
></textarea>

<div class="float-panel-actions">
  <button onclick="runAiGeneratedCodeAnalysis()">
    解析
  </button>
</div>
`
  );
}

function runAiGeneratedCodeAnalysis() {

  const editor =
    get("repairEditor");

  const input =
    get("aiCodeInput");

  if (!editor || !editor.value.trim()) {
    alert("先に修復エディタへ現在コードを読み込んでください");
    return;
  }

  if (!input || !input.value.trim()) {
    alert("AIコードを貼り付けてください");
    return;
  }

  const aiCode =
    input.value;

  const currentCode =
    editor.value;

  const aiBlocks =
    extractFunctionBlocksFromText(
      aiCode
    );

  const currentBlocks =
    extractFunctionBlocksFromText(
      currentCode
    );

  if (!aiBlocks.length) {
    alert("AI出力からfunctionを検出できませんでした");
    return;
  }

  const currentMap =
    new Map(
      currentBlocks.map(block => [
        block.name,
        block
      ])
    );

  const changes =
    aiBlocks.map(block => {

      const current =
        currentMap.get(block.name);

      const target =
        classifyAiChanges(
          block.name,
          {
            code: block.block,
            currentBlock: current,
            currentFile: currentRepairFile
          }
        );

      if (!current) {
        return {
          type: "add",
          name: block.name,
          line: null,
          risk: "middle",
          targetFile: target.file,
          targetScore: target.score,
          targetReason: target.reason,
          oldCode: "",
          newCode: block.block
        };
      }

      const line =
        currentCode
          .slice(0, current.start)
          .split("\n")
          .length;

      if (
        current.block.trim() ===
        block.block.trim()
      ) {
        return {
          type: "same",
          name: block.name,
          line,
          risk: "low",
          targetFile: target.file,
          targetScore: target.score,
          targetReason: target.reason,
          oldCode: current.block,
          newCode: block.block
        };
      }

      return {
        type: "replace",
        name: block.name,
        line,
        risk: "high",
        targetFile: target.file,
        targetScore: target.score,
        targetReason: target.reason,
        oldCode: current.block,
        newCode: block.block
      };
    });

  const report =
    buildAiIntegrationReport(
      changes
    );

  latestAiIntegrationReport =
    report;

  latestAiIntegrationChanges =
    changes;

  openFloatPanel(
    "AIコード解析結果",
    `
<div class="float-panel-actions">

  <button onclick="copyAiIntegrationReport()">
    📋 コピー
  </button>

  <button onclick="showAiIntegrationDiff()">
    🧩 Diff
  </button>

  <button onclick="testAiIntegrationSandbox()">
    🧪 Sandbox
  </button>

  <button onclick="runAiAutoTest()">
    ✅ AutoTest
  </button>

  <button onclick="applyAiIntegration()">
    🚀 適用
  </button>

</div>

<pre class="code-preview">
${escapeHtml(report)}
</pre>
`
  );
}

function buildAiIntegrationReport(changes) {

  const add =
    changes.filter(x => x.type === "add");

  const replace =
    changes.filter(x => x.type === "replace");

  const same =
    changes.filter(x => x.type === "same");

  const lines = [];

  lines.push("AI Code Integration Report");
  lines.push("");
  lines.push("=== Summary ===");
  lines.push("add: " + add.length);
  lines.push("replace: " + replace.length);
  lines.push("same: " + same.length);
  lines.push("");

  lines.push("=== Add Function ===");

  lines.push(
    add.length
      ? add.map(x => {

          return (
            "＋ " +
            x.name +
            "\n→ " +
            (x.targetFile || "unknown") +
            "\nscore: " +
            (x.targetScore ?? 0) +
            "\nreason: " +
            (x.targetReason || "unknown")
          );

        }).join("\n\n")
      : "none"
  );

  lines.push("");

  lines.push("=== Replace Function ===");

  lines.push(
    replace.length
      ? replace.map(x => {

          return (
            "⚠ " +
            x.name +
            " / L" +
            x.line +
            "\n→ " +
            (x.targetFile || "unknown") +
            "\nscore: " +
            (x.targetScore ?? 0) +
            "\nreason: " +
            (x.targetReason || "unknown")
          );

        }).join("\n\n")
      : "none"
  );

  lines.push("");

  lines.push("=== Same Function ===");

  lines.push(
    same.length
      ? same.map(x => {

          return (
            "＝ " +
            x.name +
            "\n→ " +
            (x.targetFile || "unknown") +
            "\nscore: " +
            (x.targetScore ?? 0) +
            "\nreason: " +
            (x.targetReason || "unknown")
          );

        }).join("\n\n")
      : "none"
  );

  return lines.join("\n");
}

function copyAiIntegrationReport() {

  if (!latestAiIntegrationReport) {
    alert("コピー内容なし");
    return;
  }

  const ok =
    copyTextFallback(
      latestAiIntegrationReport
    );

  alert(
    ok
      ? "AIコード解析結果をコピーしました"
      : "コピー失敗"
  );
}

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

/* ===============================
   ai_classifier
=============================== */

function classifyAiChanges(
  functionName = "",
  options = {}
) {

  const name =
    String(functionName || "")
      .toLowerCase();

  const code =
    String(options.code || "");

  const currentBlock =
    options.currentBlock || null;

  const currentFile =
    String(
      options.currentFile ||
      currentRepairFile ||
      ""
    );

  const targetComment =
    code.match(
      /\/\/\s*targetFile\s*:\s*([a-zA-Z0-9_.\-\/]+\.js)/
    );

  if (targetComment) {
    return {
      file: targetComment[1],
      score: 99,
      reason: "targetFile comment"
    };
  }

  if (
    currentBlock &&
    currentFile
  ) {
    return {
      file: currentFile,
      score: 90,
      reason: "existing function file"
    };
  }

  const config =
    getProjectConfig();

  const rules =
    getProjectConfig().moduleRules;

  let bestFile =
    "unknown";

  let bestScore =
    0;

  rules.forEach(rule => {

    let score = 0;

    rule.words.forEach(word => {

      if (name.includes(word)) {
        score++;
      }

    });

    if (score > bestScore) {
      bestScore = score;
      bestFile = rule.file;
    }

  });

  return {
    file: bestFile,
    score: bestScore,
    reason:
      bestScore > 0
        ? "keyword"
        : "unknown"
  };
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

  saveDeleteRollbackSnapshot();

  let text =
    editor.value;

  let addCount = 0;
  let replaceCount = 0;
  let skipCount = 0;

  latestAiIntegrationChanges.forEach(
    change => {

      if (
        change.type === "same"
      ) {
        skipCount++;
        return;
      }

      if (
        change.type === "replace"
      ) {

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
          text.slice(
            0,
            block.start
          ) +
          change.newCode +
          text.slice(
            block.end
          );

        replaceCount++;
        return;
      }

      if (
        change.type === "add"
      ) {

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

    }
  );

  editor.value =
    text;

  repairLastValue =
    text;

  const health =
    validateBackupHtml(
      text
    );

  if (!health.js_ok) {

    rollbackLastDelete(
      true
    );

    alert(
      "AI統合失敗\n\n" +
      health.js_error
    );

    return;
  }

  updateLineNumbers();
  updateCursorPosition();

  autoSaveRepairDraft();

  updateRepairStatus(
    `AI統合成功 add:${addCount} replace:${replaceCount}`
  );

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

function testAiIntegrationSandbox() {

  const editor =
    get("repairEditor");

  if (!editor) {
    alert("repairEditorなし");
    return;
  }

  if (
    !latestAiIntegrationChanges ||
    !latestAiIntegrationChanges.length
  ) {
    alert("Sandbox対象なし");
    return;
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

  const health =
    validateBackupHtml(text);

  const report =
`AI Integration Sandbox

=== Result ===
${health.js_ok ? "✔ OK" : "⚠ NG"}

=== Count ===
add: ${addCount}
replace: ${replaceCount}
skip: ${skipCount}

=== JS Error ===
${health.js_error || "none"}
`;

  openFloatPanel(
    "AI Sandbox",
    `
<pre class="code-preview">
${escapeHtml(report)}
</pre>
`
  );
}

/* ===============================
   AI Auto Test
=============================== */

function addProtectedFunctionName(name) {

  const list =
    loadJson(
      "extraProtectedFunctions",
      []
    );

  if (!list.includes(name)) {
    list.push(name);
    localStorage.setItem(
      "extraProtectedFunctions",
      JSON.stringify(list)
    );
  }
}

function getAllProtectedFunctionNames() {

  const base =
    getProtectedFunctionNames();

  const extra =
    loadJson(
      "extraProtectedFunctions",
      []
    );

  extra.forEach(name =>
    base.add(name)
  );

  return base;
}


function detectAiInputDuplicateFunctions() {

  if (
    !latestAiIntegrationChanges ||
    !latestAiIntegrationChanges.length
  ) {
    return [];
  }

  const names =
    latestAiIntegrationChanges.map(
      x => x.name
    );

  return [
    ...new Set(
      names.filter(
        (name, index) =>
          names.indexOf(name) !== index
      )
    )
  ];
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

function detectUndefinedOnclicksInText(text) {

  const onclicks =
    [...text.matchAll(
      /onclick\s*=\s*["'][^"']*?\b([a-zA-Z_$][\w$]*)\s*\(/g
    )].map(m => m[1]);

  const funcs =
    extractFunctionNames(text);

  return onclicks.filter(name =>
    !funcs.includes(name)
  );
}

function detectMissingFunctionCallsInText(text) {

  const funcs =
    extractFunctionNames(text);

  const config =
    typeof getProjectConfig === "function"
      ? getProjectConfig()
      : {};

  const ignore =
    new Set(
      config.ignoreFunctionCalls || []
    );

  const calls =
    [...text.matchAll(
      /\b([a-zA-Z_$][\w$]*)\s*\(/g
    )].map(m => m[1]);

  return [
    ...new Set(
      calls.filter(name =>
        !funcs.includes(name) &&
        !ignore.has(name)
      )
    )
  ];
}

function calcAiAutoHealthScore(results) {

  let score = 100;

  if (!results.jsOk) {
    score -= 40;
  }

  if (results.dupFuncs.length) {
    score -= 20;
  }

  if (results.aiDupFuncs.length) {
    score -= 20;
  }

  if (results.undefinedOnclicks.length) {
    score -= 20;
  }

  if (results.missingCalls.length) {
    score -= 10;
  }

  if (results.protectedChanges.length) {
    score -= 30;
  }

  return Math.max(
    0,
    score
  );
}

function detectProtectedAiChanges() {

  if (
    !latestAiIntegrationChanges ||
    !latestAiIntegrationChanges.length
  ) {
    return [];
  }

  const protectedNames =
    getAllProtectedFunctionNames();

  return latestAiIntegrationChanges
    .filter(change => {

      if (change.type !== "replace") {
        return false;
      }

      return protectedNames.has(
        change.name
      );

    })
    .map(change => change.name);

}

function runAiAutoTest() {

  const virtual =
    buildAiIntegrationVirtualText();

  if (!virtual) {
    alert("AutoTest対象なし");
    return;
  }

  const validation =
    validateBackupHtml(
      virtual.text
    );

  const funcs =
    extractFunctionNames(
      virtual.text
    );

  const dupFuncs =
    [...new Set(
      funcs.filter(
        (f, i) =>
          funcs.indexOf(f) !== i
      )
    )];

  const aiDupFuncs =
    detectAiInputDuplicateFunctions();

  const undefinedOnclicks =
    detectUndefinedOnclicksInText(
      virtual.text
    );

  const missingCalls =
    detectMissingFunctionCallsInText(
      virtual.text
    );

  const protectedChanges =
    detectProtectedAiChanges();

  const missingCriticalFunctions =
    detectMissingCriticalFunctionsInText(
      virtual.text
    );

  const results = {
    jsOk: validation.js_ok,
    dupFuncs,
    aiDupFuncs,
    undefinedOnclicks,
    missingCalls,
    protectedChanges,
    missingCriticalFunctions
  };

  const healthScore =
    calcAiAutoHealthScore(
      results
    );

  const pass =
    validation.js_ok &&
    dupFuncs.length === 0 &&
    aiDupFuncs.length === 0 &&
    undefinedOnclicks.length === 0 &&
    protectedChanges.length === 0;

  latestAiAutoTestPassed =
    pass;

  const report =
`AI Auto Test Report

=== Result ===
${pass ? "PASS" : "FAIL"}

=== Health Score ===
${healthScore}/100

=== Apply Count ===
add: ${virtual.addCount}
replace: ${virtual.replaceCount}
skip: ${virtual.skipCount}

=== JavaScript ===
${validation.js_ok ? "✔ OK" : "⚠ NG"}
${validation.js_error || ""}

=== Duplicate Functions ===
${dupFuncs.length ? dupFuncs.join("\n") : "✔ none"}

=== AI Input Duplicate Functions ===
${aiDupFuncs.length ? aiDupFuncs.join("\n") : "✔ none"}

=== Undefined onclick ===
${undefinedOnclicks.length ? undefinedOnclicks.join("\n") : "✔ none"}

=== Missing Function Calls ===
${missingCalls.length ? missingCalls.join("\n") : "✔ none"}

=== Protected Function Changes ===
${protectedChanges.length ? protectedChanges.join("\n") : "✔ none"}

=== Missing Critical Functions ===
${missingCriticalFunctions.length ? missingCriticalFunctions.join("\n") : "✔ none"}

=== Function Count ===
${funcs.length}
`;

  latestAiAutoTestReport =
    report;

  openFloatPanel(
    "AI AutoTest",
    `
<div class="float-panel-actions">
  <button onclick="copyAiAutoTestReport()">
    📋 コピー
  </button>
</div>

<pre class="code-preview">
${escapeHtml(report)}
</pre>
`
  );
}

function copyAiAutoTestReport() {

  if (!latestAiAutoTestReport) {
    alert("コピー内容なし");
    return;
  }

  const ok =
    copyTextFallback(
      latestAiAutoTestReport
    );

  alert(
    ok
      ? "AutoTest結果をコピーしました"
      : "コピー失敗"
  );
}

function detectMissingCriticalFunctionsInText(text) {

  const funcs =
    extractFunctionNames(text);

  const config =
    typeof getProjectConfig === "function"
      ? getProjectConfig()
      : {};

  const critical =
    config.criticalFunctions ||
    new Set();

  return [
    ...critical
  ].filter(name =>
    !funcs.includes(name)
  );

}

window.runAiAutoTest =
  runAiAutoTest;

window.copyAiAutoTestReport =
  copyAiAutoTestReport;

window.analyzeAiGeneratedCode =
  analyzeAiGeneratedCode;

window.runAiGeneratedCodeAnalysis =
  runAiGeneratedCodeAnalysis;

window.copyAiIntegrationReport =
  copyAiIntegrationReport;

window.showAiIntegrationDiff =
  showAiIntegrationDiff;

window.applyAiIntegration =
  applyAiIntegration;

window.testAiIntegrationSandbox =
  testAiIntegrationSandbox;

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

console.log(
  "08_ai_integrator loaded"
);