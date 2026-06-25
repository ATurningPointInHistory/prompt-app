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
      );

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

  lines.push(buildProjectSummary());
  lines.push("");

  lines.push(buildProjectEntryPointReport());
  lines.push("");

  lines.push(buildProjectSourceFlowReport());
  lines.push("");

  lines.push(buildSharedStoreReport());
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
   Project Summary
=============================== */

function buildProjectSummary() {

  const state =
    typeof buildProjectState ===
      "function"
      ? buildProjectState()
      : {
          files: [],
          html: [],
          js: [],
          css: [],
          json: []
        };

  const database =
    window.projectDatabase ||
    {};

  const functionDatabase =
    database.functions ||
    window.projectFunctionDatabase ||
    {};

  const mode =
    typeof getCurrentProjectAnalyzeMode ===
      "function"
      ? getCurrentProjectAnalyzeMode()
      : "unknown";

  const lines = [];

  lines.push(
    "=== Project Summary ==="
  );

  lines.push("");

  lines.push(
    "Project:"
  );

  lines.push(
    PROJECT_INFO?.name ||
    "Unknown"
  );

  lines.push("");

  lines.push(
    "Version:"
  );

  lines.push(
    PROJECT_INFO?.version ||
    "Unknown"
  );

  lines.push("");

  lines.push(
    "Analyze Mode:"
  );

  lines.push(
    typeof getAnalyzeSourceModeLabel ===
      "function"
      ? getAnalyzeSourceModeLabel(
          mode
        )
      : mode
  );

  lines.push("");

  lines.push(
    "Files:"
  );

  lines.push(
    String(
      state.files.length
    )
  );

  lines.push("");

  lines.push(
    "HTML:"
  );

  lines.push(
    String(
      state.html.length
    )
  );

  lines.push("");

  lines.push(
    "JavaScript:"
  );

  lines.push(
    String(
      state.js.length
    )
  );

  lines.push("");

  lines.push(
    "CSS:"
  );

  lines.push(
    String(
      state.css.length
    )
  );

  lines.push("");

  lines.push(
    "JSON:"
  );

  lines.push(
    String(
      state.json.length
    )
  );

  lines.push("");

  lines.push(
    "Functions:"
  );

  lines.push(
    String(
      Object.keys(
        functionDatabase
      ).length
    )
  );

  lines.push("");

  lines.push(
    "Database:"
  );

  lines.push(
    Object.keys(
      functionDatabase
    ).length
      ? "Loaded"
      : "Not Loaded"
  );

  lines.push("");

  lines.push(
    "Repair Store:"
  );

  lines.push(
    String(
      typeof getRepairSearchFiles ===
        "function"
        ? getRepairSearchFiles()
            .length
        : 0
    )
  );

  return lines.join("\n");

}

/* ===============================
   Entry Point Report
=============================== */

function buildProjectEntryPointReport() {

  const lines = [];

  lines.push(
    "=== Entry Points ==="
  );

  lines.push("");

  lines.push(
    "Application"
  );

  lines.push(
    "index.html"
  );

  lines.push("");

  lines.push(
    "Startup"
  );

  lines.push(
    "99_init.js"
  );

  lines.push(
    "↓"
  );

  lines.push(
    "initRepairIde()"
  );

  lines.push("");

  lines.push(
    "Page Switch"
  );

  lines.push(
    "01_bootstrap.js"
  );

  lines.push(
    "↓"
  );

  lines.push(
    "switchAppPage()"
  );

  lines.push("");

  lines.push(
    "Repair"
  );

  lines.push(
    "loadRepairHtml()"
  );

  lines.push("");

  lines.push(
    "Project"
  );

  lines.push(
    "loadCurrentProjectSearchFiles()"
  );

  lines.push("");

  lines.push(
    "Database"
  );

  lines.push(
    "updateProjectDatabase()"
  );

  lines.push("");

  lines.push(
    "Health"
  );

  lines.push(
    "showHtmlHealth()"
  );

  lines.push("");

  lines.push(
    "AI"
  );

  lines.push(
    "analyzeAiGeneratedCode()"
  );

  return lines.join("\n");

}

/* ===============================
   Shared Store Report
=============================== */

function buildSharedStoreReport() {

  const lines = [];

  lines.push(
    "=== Shared Store ==="
  );

  lines.push("");

  lines.push(
    "Project Store"
  );

  lines.push(
    "- repairSearchFileStore"
  );

  lines.push(
    "- projectDatabase"
  );

  lines.push(
    "- projectFunctionDatabase"
  );

  lines.push("");

  lines.push(
    "Current State"
  );

  lines.push(
    "- currentRepairFile"
  );

  lines.push(
    "- currentProjectAnalyzeMode"
  );

  lines.push("");

  lines.push(
    "Repair"
  );

  lines.push(
    "- repairUndoStack"
  );

  lines.push(
    "- repairRedoStack"
  );

  lines.push(
    "- repairSearchHistory"
  );

  lines.push("");

  lines.push(
    "Task"
  );

  lines.push(
    "- runningTasks"
  );

  lines.push(
    "- TASK"
  );

  lines.push("");

  lines.push(
    "Shared Functions"
  );

  lines.push(
    "registerRepairSearchFile()"
  );

  lines.push(
    "getProjectFiles()"
  );

  lines.push(
    "buildProjectState()"
  );

  lines.push(
    "updateProjectDatabase()"
  );

  lines.push(
    "getProjectAnalyzeSources()"
  );

  return lines.join("\n");

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