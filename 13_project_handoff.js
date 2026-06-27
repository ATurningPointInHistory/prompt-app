/* ===============================
   FILE: 13_project_handoff.js
   Project Handoff Report
=============================== */

/* ===============================
   Build AI Handoff Report
=============================== */

function buildAiHandoffReport() {

  const lines = [];

  lines.push("AI HANDOFF REPORT");
  lines.push("");

  /* ===============================
     Project
  ============================== */

  lines.push(buildProjectSummary());
  lines.push("");

  lines.push(buildProjectEntryPointReport());
  lines.push("");

  lines.push(buildProjectArchitectureReport());
  lines.push("");

  /* ===============================
     Source
  ============================== */

  lines.push(buildProjectSourceFlowReport());
  lines.push("");

  lines.push(buildSharedStoreReport());
  lines.push("");

  lines.push(buildProjectManagerReport());
  lines.push("");

  /* ===============================
     Analyze
  ============================== */

  lines.push(buildAnalyzerFlowReport());
  lines.push("");

  lines.push(buildButtonRelationReport());
  lines.push("");

  lines.push(buildProjectDatabaseFlowReport());
  lines.push("");

  lines.push(buildRepairFlowReport());
  lines.push("");

  lines.push(buildAiIntegrationFlowReport());
  lines.push("");

  /* ===============================
     Dependency
  ============================== */

  lines.push(buildCallGraphReport());
  lines.push("");

  lines.push(buildReverseCallGraphReport());
  lines.push("");

  lines.push(buildDependencyTreeReport());
  lines.push("");

  lines.push(buildModuleDependencyReport());
  lines.push("");

  /* ===============================
     AI
  ============================== */

  lines.push(buildAiRepairGuideReport());
  lines.push("");

  lines.push(buildRecommendedRepairOrderReport());
  lines.push("");

  return lines.join("\n");

}

/* ===============================
   Analyzer Structure Report
=============================== */

function buildAnalyzerStructureReport() {

  return `=== Analyzer Structure ===

Function Analyzer

Entry
showFunctionAnalyzer()

Uses
Project Function Database
Repair Editor
currentRepairFile

Calls
getFunctionInfoFromDatabase()
jumpToFunction()

Output
Function detail
Calls / Called By
Dependencies
AI handoff information


Module Analyzer

Entry
generateModuleAnalyzer()

Uses
Project sources
Top level functions
Nested functions
Module keywords

Calls
extractCodeBlocksFromText()
extractModuleKeywords()
extractCalledFunctionsFromBlocks()

Output
Module role
Summary
Function count
Dependencies
Risk
AI summary


Project Analyzer

Entry
updateProjectDatabase()

Uses
Project sources
Project files
Project functions
Project modules

Calls
buildProjectDatabase()
buildProjectFunctionDatabase()
buildProjectModuleDatabase()
buildProjectDatabaseStatistics()

Output
Project Database
Function Database
Module Database
Project statistics


AI Report Manager

Entry
showAiReportManager()

Uses
Project Database
Report builder functions
Selected checkbox state

Calls
buildAiReportManagerHtml()
generateSelectedAiReport()
copySelectedAiReport()

Output
Selected AI report
AI handoff text
`;
}


/* ===============================
   Show AI Handoff Report
=============================== */

function showAiHandoffReport() {

  const text =
    buildAiHandoffReport();

  window.latestAiHandoffReport =
    text;

  if (
    typeof openFloatPanel === "function"
  ) {

    openFloatPanel(
      "AI Handoff Report",
      `
<div class="float-panel-actions">
  <button onclick="copyAiHandoffReport()">
    📋 コピー
  </button>
</div>

<pre class="code-preview">
${escapeHtml(text)}
</pre>
`
    );

    return;
  }

  alert(text);

}

/* ===============================
   Copy AI Handoff Report
=============================== */

function copyAiHandoffReport() {

  const text =
    buildAiHandoffReport();

  window.latestAiHandoffReport =
    text;

  if (
    navigator.clipboard &&
    window.isSecureContext
  ) {
    navigator.clipboard
      .writeText(text)
      .then(() =>
        alert("AI引き継ぎレポートをコピーしました")
      )
      .catch(() => {
        const ok =
          copyTextFallback(text);

        alert(
          ok
            ? "コピー完了"
            : "コピー失敗"
        );
      });

    return;
  }

  const ok =
    copyTextFallback(text);

  alert(
    ok
      ? "コピー完了"
      : "コピー失敗"
  );

}

/* ===============================
   Build AI Report Manager HTML
=============================== */

function buildAiReportManagerHtml() {

  return `
<div class="ai-report-manager">

<label>
<input
type="checkbox"
id="aiReportSummary"
checked>
Project Summary
</label><br>

<label>
<input
type="checkbox"
id="aiReportEntry"
checked>
Entry Points
</label><br>

<label>
<input
type="checkbox"
id="aiReportArchitecture"
checked>
Project Architecture
</label><br>

<label>
<input
type="checkbox"
id="aiReportSourceFlow"
checked>
Project Source Flow
</label><br>

<label>
<input
type="checkbox"
id="aiReportSharedStore"
checked>
Shared Store
</label><br>

<label>
<input
type="checkbox"
id="aiReportManager"
checked>
Project Manager
</label><br>

<label>
<input
type="checkbox"
id="aiReportAnalyzer"
checked>
Analyzer Flow
</label><br>

<label>
<input
type="checkbox"
id="aiReportAnalyzerStructure"
checked>
Analyzer Structure
</label><br>

<label>
<input
type="checkbox"
id="aiReportDatabase"
checked>
Database Flow
</label><br>

<label>
<input
type="checkbox"
id="aiReportRepair"
checked>
Repair Flow
</label><br>

<label>
<input
type="checkbox"
id="aiReportIntegration"
checked>
AI Integration Flow
</label><br>

<label>
<input
type="checkbox"
id="aiReportButton"
checked>
Button Relation
</label><br>

<label>
<input
type="checkbox"
id="aiReportCall"
checked>
Call Graph
</label><br>

<label>
<input
type="checkbox"
id="aiReportReverse"
checked>
Reverse Call Graph
</label><br>

<label>
<input
type="checkbox"
id="aiReportDependency"
checked>
Dependency Tree
</label><br>

<label>
<input
type="checkbox"
id="aiReportModule"
checked>
Module Dependency
</label><br>

<label>
<input
type="checkbox"
id="aiReportGuide"
checked>
AI Repair Guide
</label><br>

<label>
<input
type="checkbox"
id="aiReportOrder"
checked>
Recommended Repair Order
</label>

<hr>

<button onclick="generateSelectedAiReport()">
📄 Generate
</button>

<button onclick="copySelectedAiReport()">
📋 Copy
</button>

<pre
id="aiReportOutput"
class="code-preview">
Select Generate.
</pre>

</div>
`;

}

/* ===============================
   AI Report Manager
=============================== */

function showAiReportManager() {

  if (
    typeof openFloatPanel !== "function"
  ) {
    alert("openFloatPanel が見つかりません");
    return;
  }

  openFloatPanel(
    "AI Report Manager",
    buildAiReportManagerHtml()
  );

}

/* ===============================
   Generate Selected AI Report
=============================== */

function generateSelectedAiReport() {

  const lines = [];

  if (
    get("aiReportSummary")?.checked
  ) {
    lines.push(
      buildProjectSummary()
    );
    lines.push("");
  }

  if (
    get("aiReportEntry")?.checked
  ) {
    lines.push(
      buildProjectEntryPointReport()
    );
    lines.push("");
  }

  if (
    get("aiReportArchitecture")?.checked
  ) {
    lines.push(
      buildProjectArchitectureReport()
    );
    lines.push("");
  }

  if (
    get("aiReportSourceFlow")?.checked
  ) {
    lines.push(
      buildProjectSourceFlowReport()
    );
    lines.push("");
  }

  if (
    get("aiReportSharedStore")?.checked
  ) {
    lines.push(
      buildSharedStoreReport()
    );
    lines.push("");
  }

  if (
    get("aiReportManager")?.checked
  ) {
    lines.push(
      buildProjectManagerReport()
    );
    lines.push("");
  }

  if (
    get("aiReportAnalyzer")?.checked
  ) {
    lines.push(
      buildAnalyzerFlowReport()
    );
    lines.push("");
  }

    if (
    get("aiReportAnalyzerStructure")?.checked
  ) {
    lines.push(
      buildAnalyzerStructureReport()
    );
    lines.push("");
  }

  if (
    get("aiReportDatabase")?.checked
  ) {
    lines.push(
      buildProjectDatabaseFlowReport()
    );
    lines.push("");
  }

  if (
    get("aiReportRepair")?.checked
  ) {
    lines.push(
      buildRepairFlowReport()
    );
    lines.push("");
  }

  if (
    get("aiReportIntegration")?.checked
  ) {
    lines.push(
      buildAiIntegrationFlowReport()
    );
    lines.push("");
  }

  if (
    get("aiReportButton")?.checked
  ) {
    lines.push(
      buildButtonRelationReport()
    );
    lines.push("");
  }

  if (
    get("aiReportCall")?.checked
  ) {
    lines.push(
      buildCallGraphReport()
    );
    lines.push("");
  }

  if (
    get("aiReportReverse")?.checked
  ) {
    lines.push(
      buildReverseCallGraphReport()
    );
    lines.push("");
  }

  if (
    get("aiReportDependency")?.checked
  ) {
    lines.push(
      buildDependencyTreeReport()
    );
    lines.push("");
  }

  if (
    get("aiReportModule")?.checked
  ) {
    lines.push(
      buildModuleDependencyReport()
    );
    lines.push("");
  }

  if (
    get("aiReportGuide")?.checked
  ) {
    lines.push(
      buildAiRepairGuideReport()
    );
    lines.push("");
  }

  if (
    get("aiReportOrder")?.checked
  ) {
    lines.push(
      buildRecommendedRepairOrderReport()
    );
    lines.push("");
  }

  const text =
    lines.join("\n");

  window.latestAiHandoffReport =
    text;

  const output =
    get("aiReportOutput");

  if (output) {
    output.textContent =
      text;
  }

  return text;

}

/* ===============================
   Copy Selected AI Report
=============================== */

function copySelectedAiReport() {

  const text =
    generateSelectedAiReport();

  if (!text) {
    alert("コピーするAI Reportがありません");
    return;
  }

  copyTextFallback(text);

}

/* ===============================
   Global Export
=============================== */

window.buildAiHandoffReport =
  buildAiHandoffReport;

window.copyAiHandoffReport =
  copyAiHandoffReport;

window.showAiHandoffReport =
  showAiHandoffReport;

window.buildAiReportManagerHtml =
  buildAiReportManagerHtml;

window.showAiReportManager =
  showAiReportManager;

window.generateSelectedAiReport =
  generateSelectedAiReport;

window.copySelectedAiReport =
  copySelectedAiReport;

window.buildAnalyzerStructureReport =
  buildAnalyzerStructureReport;

console.log(
  "13_project_handoff loaded"
);