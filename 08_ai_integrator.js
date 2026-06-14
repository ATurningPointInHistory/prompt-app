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