/* ===============================
   FILE: 09_relation_map.js
   Function Relation Map
=============================== */

/* ===============================
   relation_map
=============================== */
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
          block.name
        );

      if (!current) {
        return {
          type: "add",
          name: block.name,
          line: null,
          risk: "middle",
          targetFile: target.file,
          targetScore: target.score,
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

          const target =
            classifyAiChanges(
              x.name
            );

          return (
            "＋ " +
            x.name +
            "\n→ " +
            target.file +
            "\nscore: " +
            target.score
          );

        }).join("\n\n")
      : "none"
  );
  lines.push("");

  lines.push("=== Replace Function ===");

  lines.push(
    replace.length
      ? replace.map(x => {

          const target =
            classifyAiChanges(
              x.name
            );

          return (
            "⚠ " +
            x.name +
            " / L" +
            x.line +
            "\n→ " +
            target.file +
            "\nscore: " +
            target.score
          );

        }).join("\n\n")
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

window.analyzeAiGeneratedCode =
  analyzeAiGeneratedCode;

window.runAiGeneratedCodeAnalysis =
  runAiGeneratedCodeAnalysis;

window.copyAiIntegrationReport =
  copyAiIntegrationReport;

window.showAiIntegrationDiff =
  showAiIntegrationDiff;

/* ===============================
   ai_classifier
=============================== */

function classifyAiChanges(functionName = "") {

  const name =
    String(functionName).toLowerCase();

  const rules = [

    {
      file: "00_bootstrap.js",
      score: [
        "float",
        "panel",
        "menu",
        "bootstrap",
        "switchapp"
      ]
    },

    {
      file: "01_core.js",
      score: [
        "escape",
        "copy",
        "helper",
        "util",
        "safe"
      ]
    },

    {
      file: "02_prompt.js",
      score: [
        "prompt",
        "review",
        "convert",
        "command",
        "generate"
      ]
    },

    {
      file: "03_data.js",
      score: [
        "save",
        "load",
        "history",
        "storage",
        "state"
      ]
    },

    {
      file: "04_tools.js",
      score: [
        "template",
        "danger",
        "pattern",
        "preset",
        "todo"
      ]
    },

    {
      file: "05_repair.js",
      score: [
        "repair",
        "undo",
        "redo",
        "editor",
        "functionsort"
      ]
    },

    {
      file: "06_search.js",
      score: [
        "search",
        "replace",
        "highlight",
        "cursor"
      ]
    },

    {
      file: "07_backup_health.js",
      score: [
        "backup",
        "health",
        "diagnose",
        "dependency",
        "safe"
      ]
    },

    {
      file: "09_relation_map.js",
      score: [
        "relation",
        "graph",
        "map"
      ]
    },

    {
      file: "10_ai_integrator.js",
      score: [
        "ai",
        "integration",
        "diff",
        "classifier"
      ]
    }

  ];

  let best =
    "unknown";

  let bestScore =
    0;

  rules.forEach(rule => {

    let score = 0;

    rule.score.forEach(word => {

      if (
        name.includes(word)
      ) {
        score++;
      }

    });

    if (score > bestScore) {

      bestScore = score;

      best =
        rule.file;

    }

  });

  return {
    file: best,
    score: bestScore
  };

}