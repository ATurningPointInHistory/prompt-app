/* ===============================
   FILE: 10_ai_integrator.js
   AI Code Integrator
=============================== */

let latestAiIntegrationReport = "";

function analyzeAiGeneratedCode() {

  const editor =
    get("repairEditor");

  if (!editor || !editor.value.trim()) {
    alert("先に修復エディタへ現在コードを読み込んでください");
    return;
  }

  const aiCode =
    prompt(
      "AIが出力したコードを貼り付けてください",
      ""
    );

  if (!aiCode || !aiCode.trim()) {
    return;
  }

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

      if (!current) {
        return {
          type: "add",
          name: block.name,
          line: null,
          risk: "middle"
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
        risk: "high"
      };
    });

  const report =
    buildAiIntegrationReport(
      changes
    );

  latestAiIntegrationReport =
    report;

  openFloatPanel(
    "AIコード解析",
    `
<div class="float-panel-actions">
  <button onclick="copyAiIntegrationReport()">
    📋 コピー
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