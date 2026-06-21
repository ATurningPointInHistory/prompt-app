/* ===============================
   FILE: 13_function_analyzer.js
   Function Analyzer
=============================== */

let latestFunctionAnalyzerReport = "";

function getFunctionAnalyzerInfo(
  name
) {

  if (!name) {
    return null;
  }

  if (
    window.projectDatabase &&
    projectDatabase.functions &&
    projectDatabase.functions[name]
  ) {
    return projectDatabase.functions[name];
  }

  if (
    window.projectFunctionDatabase &&
    projectFunctionDatabase[name]
  ) {
    return projectFunctionDatabase[name];
  }

  return null;

}

function buildFunctionAnalyzerReport(
  name
) {

  const info =
    getFunctionAnalyzerInfo(
      name
    );

  if (!info) {
    return [
      "FUNCTION ANALYZER",
      "",
      "=== Error ===",
      "function not found",
      "",
      "=== Function ===",
      name || "unknown"
    ].join("\n");
  }

  const lines = [];

  lines.push("FUNCTION ANALYZER");
  lines.push("");

  lines.push("=== Function ===");
  lines.push(info.name || name);
  lines.push("");

  lines.push("=== File ===");
  lines.push(info.fileName || "unknown");
  lines.push("");

  lines.push("=== Line ===");
  lines.push(String(info.line || 0));
  lines.push("");

  lines.push("=== Section ===");
  lines.push(info.section || "unknown");
  lines.push("");

  lines.push("=== Role ===");
  lines.push(info.role || "unknown");
  lines.push("");

  lines.push("=== Summary ===");
  lines.push(info.summary || "");
  lines.push("");

  lines.push("=== Parameters ===");
  lines.push(
    (info.parameters || []).length
      ? info.parameters.join(", ")
      : "none"
  );
  lines.push("");

  lines.push("=== Return ===");
  lines.push(info.returnValue || "unknown");
  lines.push("");

  lines.push("=== Calls ===");
  lines.push(
    (info.called || info.calls || []).length
      ? (info.called || info.calls).join("\n")
      : "none"
  );
  lines.push("");

  lines.push("=== Called By ===");
  lines.push(
    (info.calledBy || []).length
      ? info.calledBy.join("\n")
      : "none"
  );
  lines.push("");

  lines.push("=== Keywords ===");
  lines.push(
    (info.keywords || []).length
      ? info.keywords.join(", ")
      : "none"
  );
  lines.push("");

  lines.push("=== Code Length ===");
  lines.push(
    String(info.codeLength || 0)
  );
  lines.push("");

  lines.push("=== Risk ===");
  lines.push(info.risk || "unknown");
  lines.push("");

  lines.push("=== Handoff Priority ===");
  lines.push(
    info.handoffPriority || "unknown"
  );
  lines.push("");

  lines.push("=== Module Role ===");
  lines.push(info.moduleRole || "unknown");
  lines.push("");

  lines.push("=== Source ===");
  lines.push(info.source || "unknown");
  lines.push("");

  lines.push("=== Minimal Code ===");
  lines.push(
    info.code || "none"
  );

  return lines.join("\n");

}

function showFunctionAnalyzer(
  name
) {

  latestFunctionAnalyzerReport =
    buildFunctionAnalyzerReport(
      name
    );

  openFloatPanel(
    "Function Analyzer",
    `
<div class="float-panel-actions">

  <button onclick="copyFunctionAnalyzerReport()">
    📋 Copy
  </button>

  <button onclick="jumpFunctionAnalyzer('${escapeHtml(name || "")}')">
    ↗ Jump
  </button>

  <button onclick="copyFunctionAnalyzerMinimalCode('${escapeHtml(name || "")}')">
    📄 Code
  </button>

</div>

<pre class="code-preview">
${escapeHtml(
  latestFunctionAnalyzerReport
)}
</pre>
`
  );

}

function copyFunctionAnalyzerReport() {

  copyTextFallback(
    latestFunctionAnalyzerReport || ""
  );

  alert(
    "Function Analyzerをコピーしました"
  );

}

function copyFunctionAnalyzerMinimalCode(
  name
) {

  const info =
    getFunctionAnalyzerInfo(
      name
    );

  if (!info || !info.code) {
    alert("コードなし");
    return;
  }

  copyTextFallback(
    info.code
  );

  alert("関数コードをコピーしました");

}

function jumpFunctionAnalyzer(
  name
) {

  const info =
    getFunctionAnalyzerInfo(
      name
    );

  if (!info) {
    alert("関数情報なし");
    return;
  }

  if (
    typeof openRepairTarget === "function"
  ) {
    openRepairTarget(
      info.fileName,
      info.line || 1
    );
    return;
  }

  if (
    typeof jumpToFunction === "function"
  ) {
    jumpToFunction(
      name
    );
  }

}

window.getFunctionAnalyzerInfo =
  getFunctionAnalyzerInfo;

window.buildFunctionAnalyzerReport =
  buildFunctionAnalyzerReport;

window.showFunctionAnalyzer =
  showFunctionAnalyzer;

window.copyFunctionAnalyzerReport =
  copyFunctionAnalyzerReport;

window.copyFunctionAnalyzerMinimalCode =
  copyFunctionAnalyzerMinimalCode;

window.jumpFunctionAnalyzer =
  jumpFunctionAnalyzer;