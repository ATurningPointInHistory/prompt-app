/* ===============================
   FILE: 10_ai_integrator.js
   AI Code Integrator
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
    extractFunctionBlocksFromText(aiCode);

  const currentBlocks =
    extractFunctionBlocksFromText(currentCode);

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

      if (!current) {
        return {
          type: "add",
          name: block.name,
          line: null,
          risk: "middle",
          oldCode: "",
          newCode: block.block
        };
      }

      if (
        current.block.trim() ===
        block.block.trim()
      ) {
        return {
          type: "same",
          name: block.name,
          line:
            currentCode
              .slice(0, current.start)
              .split("\n")
              .length,
          risk: "low"
        };
      }

      return {
        type: "replace",
        name: block.name,
        line:
          currentCode
            .slice(0, current.start)
            .split("\n")
            .length,
        risk: "high",
        oldCode:
          current.block,
        newCode:
          block.block
      };
    });

  const report =
    buildAiIntegrationReport(changes);

  latestAiIntegrationReport =
    report;

  latestAiIntegrationChanges =
    changes;

  openFloatPanel(
    "AIコード解析結果",
    `
<div class="float-panel-actions">
  <button onclick="copyAiIntegrationReport()">
    📋 コピー</button>
  <button onclick="showAiIntegrationDiff()">
  🧩 Diff</button>

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
      ? add.map(x => "＋ " + x.name).join("\n")
      : "none"
  );
  lines.push("");

  lines.push("=== Replace Function ===");
  lines.push(
    replace.length
      ? replace
          .map(x =>
            "⚠ " +
            x.name +
            " / L" +
            x.line
          )
          .join("\n")
      : "none"
  );
  lines.push("");

  lines.push("=== Same Function ===");
  lines.push(
    same.length
      ? same.map(x => "＝ " + x.name).join("\n")
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

console.log(
  "10_ai_integrator loaded"
);

function showAiIntegrationDiff() {

  if (
    !Array.isArray(latestAiIntegrationChanges) ||
    latestAiIntegrationChanges.length === 0
  ) {
    alert("Diff対象がありません");
    return;
  }

  const targets =
    latestAiIntegrationChanges.filter(change =>
      change.type === "add" ||
      change.type === "replace"
    );

  if (!targets.length) {
    alert("追加・更新対象はありません");
    return;
  }

  const html =
    targets.map(change => {

      return `
<div class="ai-diff-item">

  <b>${escapeHtml(change.type)}: ${escapeHtml(change.name)}</b>

  <div class="small">
    risk: ${escapeHtml(change.risk)}
    ${
      change.line
        ? " / L" + change.line
        : ""
    }
  </div>

  <div class="small">OLD</div>
  <pre class="code-preview">${
    escapeHtml(
      change.oldCode || "none"
    )
  }</pre>

  <div class="small">NEW</div>
  <pre class="code-preview">${
    escapeHtml(
      change.newCode || "none"
    )
  }</pre>

</div>
`;
    }).join("");

  openFloatPanel(
    "AI統合Diff",
    html
  );
}

window.analyzeAiGeneratedCode =
  analyzeAiGeneratedCode;

window.runAiGeneratedCodeAnalysis =
  runAiGeneratedCodeAnalysis;

window.copyAiIntegrationReport =
  copyAiIntegrationReport;

window.showAiIntegrationDiff =
  showAiIntegrationDiff;