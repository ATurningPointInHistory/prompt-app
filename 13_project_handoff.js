/* ===============================
   FILE: 13_project_handoff.js
   Project Handoff Report
=============================== */

/* ===============================
   Build Project Source Flow Report
=============================== */

function buildProjectSourceFlowReport() {

  const mode =
    typeof getCurrentProjectAnalyzeMode === "function"
      ? getCurrentProjectAnalyzeMode()
      : "unknown";

  const sources =
    typeof getProjectAnalyzeSources === "function"
      ? getProjectAnalyzeSources(mode)
      : [];

  const fileNames =
    sources
      .map(source =>
        source.fileName || "unknown"
      )
      .slice(0, 30);

  return `
=== Project Source Flow ===

Current Mode:
${mode}

Source Count:
${sources.length}

Source Files:
${
fileNames.length
  ? fileNames.join("\n")
  : "none"
}

Flow:
Repair Editor
Current Project
Project Explorer
↓
getProjectAnalyzeSources()
↓
HTML Health
Validation
Module Analyzer
Project Analyzer
Function Analyzer
AI Analyzer
Button Relation Analyzer
`;
}

/* ===============================
   Build Project Manager Report
=============================== */

function buildProjectManagerReport() {

  return `
=== Project Manager ===

Common Source Resolver:
getProjectAnalyzeSources()

Modes:
editor
- Repair Editor
- getAnalyzeSourcesFromEditor()
- repairEditor.value

currentProject
- Current Project
- getAnalyzeSourcesFromCurrentProject()
- loadCurrentProjectSearchFiles()
- repairSearchFileStore

loadedFiles
- Project Explorer
- getAnalyzeSourcesFromLoadedFiles()
- getRepairSearchFiles()
- repairSearchFileStore

Shared Store:
repairSearchFileStore

Project Files:
getProjectFiles()
buildProjectState()
getProjectFile()
updateProjectFile()
registerRepairSearchFile()
`;
}

/* ===============================
   Build Analyzer Flow Report
=============================== */

function buildAnalyzerFlowReport() {

  return `
=== Analyzer Flow ===

HTML Health:
showHtmlHealth()
↓
getHtmlHealthSource()
↓
getProjectAnalyzeSources()

Validation:
executeProjectValidation()
↓
buildProjectState()
↓
getProjectFiles()

Module Analyzer:
generateModuleAnalyzer()
↓
getProjectAnalyzeSources()

Project Analyzer:
updateProjectDatabase()
↓
buildProjectDatabase()
↓
projectDatabase

Function Analyzer:
projectFunctionDatabase
↓
getFunctionInfoFromDatabase()

AI Analyzer:
analyzeAiGeneratedCode()
↓
AI Integration
↓
AutoTest
↓
Health

Button Relation Analyzer:
planned
↓
button onclick
↓
function database
↓
called functions
↓
related files
`;
}

/* ===============================
   Build AI Handoff Report
=============================== */

function buildAiHandoffReport() {

  const lines = [];

  lines.push("AI HANDOFF REPORT");
  lines.push("");
  lines.push("Project:");
  lines.push("AIプロンプト生成Pro");
  lines.push("");
  lines.push("Version:");
  lines.push("v6.0");
  lines.push("");
  lines.push(buildProjectSourceFlowReport());
  lines.push("");
  lines.push(buildProjectManagerReport());
  lines.push("");
  lines.push(buildAnalyzerFlowReport());

  return lines.join("\n");

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
   Global Export
=============================== */

window.buildProjectSourceFlowReport =
  buildProjectSourceFlowReport;

window.buildProjectManagerReport =
  buildProjectManagerReport;

window.buildAnalyzerFlowReport =
  buildAnalyzerFlowReport;

window.buildAiHandoffReport =
  buildAiHandoffReport;

window.copyAiHandoffReport =
  copyAiHandoffReport;

window.showAiHandoffReport =
  showAiHandoffReport;

console.log(
  "13_project_handoff loaded"
);