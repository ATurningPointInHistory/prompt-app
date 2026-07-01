/* ===============================
   FILE: 12_ai_package_builder.js
   AI Package Builder v1
=============================== */

function buildKnowledgePackage(targetId) {

  const objects =
    findPrerequisiteKnowledge(targetId);

  const lines = [];

  lines.push("==================================");
  lines.push("AI KNOWLEDGE PACKAGE");
  lines.push("==================================");
  lines.push("");

  lines.push("Target");
  lines.push(targetId);
  lines.push("");

  lines.push("Knowledge Objects");
  lines.push("----------------------------------");

  objects.forEach((object, index) => {

    lines.push(
      `${String(index + 1).padStart(2, "0")} ${object.id} ${object.title || ""}`
    );

  });

  lines.push("");
  lines.push(`Object Count : ${objects.length}`);
  lines.push("");

  lines.push("==================================");
  lines.push("END");
  lines.push("==================================");

  return lines.join("\n");

}

function showKnowledgePackage(targetId) {

  const text =
    buildKnowledgePackage(targetId);

  openFloatPanel(
    "AI Knowledge Package",
`
<div class="memo-actions">
  <button onclick="copyKnowledgePackage('${escapeJs(targetId)}')">
    📋コピー
  </button>
</div>

<pre class="code-preview">
${escapeHtml(text)}
</pre>
`
  );

}

function copyKnowledgePackage(targetId) {

  copyTextFallback(
    buildKnowledgePackage(targetId)
  );

}

function buildImpactReport(targetId) {

  const objects =
    findImpactKnowledge(targetId);

  const lines = [];

  lines.push("==================================");
  lines.push("Impact Analysis");
  lines.push("==================================");
  lines.push("");

  lines.push("Target");
  lines.push(targetId);
  lines.push("");

  lines.push("Affected Objects");
  lines.push("----------------------------------");

  objects.forEach((object, index) => {

    lines.push(
      `${String(index + 1).padStart(2, "0")} ${object.id} ${object.title || ""}`
    );

  });

  lines.push("");
  lines.push(`Affected Count : ${objects.length}`);

  return lines.join("\n");

}

function showImpactReport(targetId) {

  const text =
    buildImpactReport(targetId);

  openFloatPanel(
    "Impact Analysis",
`
<div class="memo-actions">
  <button onclick="copyImpactReport('${escapeJs(targetId)}')">
    📋コピー
  </button>
</div>

<pre class="code-preview">
${escapeHtml(text)}
</pre>
`
  );

}

function copyImpactReport(targetId) {

  copyTextFallback(
    buildImpactReport(targetId)
  );

}

window.buildKnowledgePackage =
  buildKnowledgePackage;

window.showKnowledgePackage =
  showKnowledgePackage;

window.copyKnowledgePackage =
  copyKnowledgePackage;

window.buildImpactReport =
  buildImpactReport;

window.showImpactReport =
  showImpactReport;

window.copyImpactReport =
  copyImpactReport;