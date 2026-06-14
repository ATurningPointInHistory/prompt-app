/* ===============================
   FILE: 08_ai_integrator.js
   AI Integrator Main
=============================== */

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

console.log(
  "08_ai_integrator loaded"
);