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

  const functionDatabase =
    typeof getProjectFunctionDatabase ===
      "function"
      ? getProjectFunctionDatabase()
      : {};

  const mode =
    typeof getCurrentProjectAnalyzeMode ===
      "function"
      ? getCurrentProjectAnalyzeMode()
      : "unknown";

  const projectInfo =
    window.PROJECT_INFO || {};

  const lines = [];

  lines.push(
    "=== Project Summary ==="
  );

  lines.push("");

  lines.push(
    "Project:"
  );

  lines.push(
    projectInfo.name ||
    "Unknown"
  );

  lines.push("");

  lines.push(
    "Version:"
  );

  lines.push(
    projectInfo.version ||
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
   Project Architecture Report
=============================== */

function buildProjectArchitectureReport() {

  return `=== Project Architecture ===

index.html
↓
01_bootstrap.js
↓
Repair IDE / Normal Mode

Repair IDE
↓
05_repair_*.js
↓
repairEditor
↓
Project Manager
↓
repairSearchFileStore
↓
Project Database

Project Manager
↓
01_project_manager.js
↓
getProjectAnalyzeSources()
↓
Analyzer

Analyzer
↓
13_project_database.js
↓
projectDatabase
↓
projectFunctionDatabase

Health
↓
07_health_*.js
↓
HTML Health / Validation

AI
↓
08_ai_*.js / 09_ai_*.js
↓
AI Analyzer / AI Integration / AutoTest
`;

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
   Project Database Flow
=============================== */

function buildProjectDatabaseFlowReport() {

  return `=== Database Flow ===

repairSearchFileStore
↓
getProjectFiles()
↓
buildProjectState()
↓
getProjectAnalyzeSources()
↓
buildProjectDatabase()
↓
projectDatabase
↓
projectFunctionDatabase
`;

}

/* ===============================
   Repair Flow
=============================== */

function buildRepairFlowReport() {

  return `=== Repair Flow ===

loadRepairHtml()
↓
repairEditor

↓

saveCurrentSearchEditorFile()

↓

registerRepairSearchFile()

↓

repairSearchFileStore

↓

Project Explorer

↓

Analyzer
`;

}

/* ===============================
   AI Integration Flow
=============================== */

function buildAiIntegrationFlowReport() {

  return `=== AI Integration Flow ===

analyzeAiGeneratedCode()

↓

classifyAiChanges()

↓

buildAiIntegrationReport()

↓

showAiIntegrationDiff()

↓

testAiIntegrationSandbox()

↓

runAiAutoTest()

↓

applyAiIntegration()

↓

showHtmlHealth()
`;

}

/* ===============================
   Button Relation
=============================== */

function buildButtonRelationReport() {

  const lines = [];

  lines.push(
    "=== Button Relation ==="
  );

  lines.push("");

  const html =
    document.documentElement
      ?.outerHTML || "";

  const buttons =
    [...html.matchAll(
      /onclick="([^"]+)"/g
    )];

  if (!buttons.length) {
    lines.push(
      "No onclick found."
    );

    return lines.join("\n");
  }

  buttons
    .slice(0, 80)
    .forEach(match => {

      const onclick =
        match[1];

      const func =
        onclick
          .split("(")[0]
          .trim();

      lines.push("Button");
      lines.push("↓");
      lines.push(onclick);
      lines.push("↓");
      lines.push(func + "()");

      if (
        typeof getFunctionInfoFromDatabase ===
        "function"
      ) {

        const info =
          getFunctionInfoFromDatabase(
            func
          );

        if (info) {

          const called =
            filterSelfFunctionCalls(
              func,
              getFunctionCalledList(info)
            );

          lines.push("↓");
          lines.push("Calls");

          if (called.length) {
            called
              .slice(0, 10)
              .forEach(fn => {
                lines.push(
                  "- " + fn + "()"
                );
              });
          } else {
            lines.push("- none");
          }

          lines.push("↓");
          lines.push("File");

          lines.push(
            getFunctionFileName(info)
          );

        } else {

          lines.push("↓");
          lines.push(
            "not found in function database"
          );

        }

      }

      lines.push("");

    });

  return lines.join("\n");

}

/* ===============================
   Call Graph Report
=============================== */

function buildCallGraphReport() {

  const database =
    getProjectFunctionDatabase();

  const targetFunctions = [
    ...getProjectCoreFunctions(),
    "getHtmlHealthSource",
    "buildModuleAnalysis"
  ];

  const lines = [];

  lines.push(
    "=== Call Graph ==="
  );

  lines.push("");

  if (
    !hasProjectFunctionDatabase(database)
  ) {
    lines.push(
      "skip: projectFunctionDatabase not loaded"
    );

    return lines.join("\n");
  }

  targetFunctions.forEach(name => {

    const info =
      database[name];

    if (!info) {
      return;
    }

    lines.push(
      name + "()"
    );

    lines.push(
      "↓"
    );

    const called =
      filterSelfFunctionCalls(
        name,
        getFunctionCalledList(info)
      );

    if (!called.length) {

      lines.push(
        "no calls"
      );

    } else {

      called
        .slice(0, 20)
        .forEach(fn => {
          lines.push(
            "- " + fn + "()"
          );
        });

    }

    lines.push("");

  });

  return lines.join("\n");

}

/* ===============================
   Reverse Call Graph Report
=============================== */

function buildReverseCallGraphReport() {

  const database =
    getProjectFunctionDatabase();

  const targetFunctions = [
    ...getProjectCoreFunctions(),
    "getRepairSearchFiles",
    "registerRepairSearchFile",
    "updateLineNumbers",
    "updateCursorPosition"
  ];

  const lines = [];

  lines.push(
    "=== Reverse Call Graph ==="
  );

  lines.push("");

  if (
    !hasProjectFunctionDatabase(database)
  ) {
    lines.push(
      "skip: projectFunctionDatabase not loaded"
    );

    return lines.join("\n");
  }

  targetFunctions.forEach(name => {

    const info =
      database[name];

    if (!info) {
      return;
    }

    lines.push(
      name + "()"
    );

    lines.push(
      "Called By:"
    );

    const calledBy =
      filterSelfFunctionCalls(
        name,
        getFunctionCalledByList(info)
      );

    if (!calledBy.length) {

      lines.push(
        "- none"
      );

    } else {

      calledBy
        .slice(0, 20)
        .forEach(fn => {
          lines.push(
            "- " + fn + "()"
          );
        });

    }

    lines.push("");

  });

  return lines.join("\n");

}

/* ===============================
   Dependency Tree Report
=============================== */

function buildDependencyTreeReport() {

  const database =
    getProjectFunctionDatabase();

  const targetFunctions =
    getProjectCoreFunctions();

  const lines = [];

  lines.push(
    "=== Dependency Tree ==="
  );

  lines.push("");

  if (
    !hasProjectFunctionDatabase(database)
  ) {
    lines.push(
      "skip: projectFunctionDatabase not loaded"
    );

    return lines.join("\n");
  }

  targetFunctions.forEach(name => {

    const info =
      database[name];

    if (!info) {
      return;
    }

    const called =
      filterSelfFunctionCalls(
        name,
        getFunctionCalledList(info)
      );
    
    const calledBy =
      filterSelfFunctionCalls(
        name,
        getFunctionCalledByList(info)
      );

    lines.push(
      name + "()"
    );

    lines.push(
      "File:"
    );

    lines.push(
      getFunctionFileName(info)
    );

    lines.push(
      "Calls:"
    );

    if (called.length) {
      called
        .slice(0, 15)
        .forEach(fn => {
          lines.push(
            "- " + fn + "()"
          );
        });
    } else {
      lines.push(
        "- none"
      );
    }

    lines.push(
      "Called By:"
    );

    if (calledBy.length) {
      calledBy
        .slice(0, 15)
        .forEach(fn => {
          lines.push(
            "- " + fn + "()"
          );
        });
    } else {
      lines.push(
        "- none"
      );
    }

    lines.push("");

  });

  return lines.join("\n");

}

/* ===============================
   Module Dependency Report
=============================== */

function buildModuleDependencyReport() {

  const database =
    getProjectFunctionDatabase();

  const lines = [];

  lines.push(
    "=== Module Dependency ==="
  );

  lines.push("");

  if (
    !hasProjectFunctionDatabase(database)
  ) {
    lines.push(
      "skip: projectFunctionDatabase not loaded"
    );

    return lines.join("\n");
  }

  const modules = {};

  Object.values(database)
    .forEach(info => {

      const fileName =
        getFunctionFileName(info);

      const functionName =
        getFunctionName(info);

      if (!modules[fileName]) {
        modules[fileName] = {
          functions: [],
          calls: new Set()
        };
      }

      modules[fileName]
        .functions
        .push(
          functionName
        );

      const called =
        filterSelfFunctionCalls(
          functionName,
          getFunctionCalledList(info)
        );

      called.forEach(fn => {
        modules[fileName]
          .calls
          .add(fn);
      });

    });

  Object.keys(modules)
    .sort()
    .slice(0, 40)
    .forEach(fileName => {

      const item =
        modules[fileName];

      lines.push(
        fileName
      );

      lines.push(
        "Functions:"
      );

      item.functions
        .slice(0, 12)
        .forEach(fn => {
          lines.push(
            "- " + fn + "()"
          );
        });

      if (
        item.functions.length > 12
      ) {
        lines.push(
          "... +" +
          (
            item.functions.length - 12
          ) +
          " more"
        );
      }

      lines.push(
        "Calls:"
      );

      const calls =
        [...item.calls]
          .sort();

      if (!calls.length) {
        lines.push(
          "- none"
        );
      } else {
        calls
          .slice(0, 12)
          .forEach(fn => {
            lines.push(
              "- " + fn + "()"
            );
          });
      }

      lines.push("");

    });

  return lines.join("\n");

}

/* ===============================
   AI Repair Guide Report
=============================== */

function buildAiRepairGuideReport() {

  const lines = [];

  lines.push(
    "=== AI Repair Guide ==="
  );

  lines.push("");

  lines.push(
    "Rule 1"
  );
  lines.push(
    "- Modify one function at a time."
  );
  lines.push("");

  lines.push(
    "Rule 2"
  );
  lines.push(
    "- Reuse existing common functions whenever possible."
  );
  lines.push("");

  lines.push(
    "Rule 3"
  );
  lines.push(
    "- Do not rename public functions unless required."
  );
  lines.push("");

  lines.push(
    "Rule 4"
  );
  lines.push(
    "- Preserve window exports."
  );
  lines.push("");

  lines.push(
    "Rule 5"
  );
  lines.push(
    "- Keep build/show/update/execute separation."
  );
  lines.push("");

  lines.push(
    "Rule 6"
  );
  lines.push(
    "- After modifications update Project Database."
  );
  lines.push("");

  lines.push(
    "Rule 7"
  );
  lines.push(
    "- Run HTML Health."
  );
  lines.push("");

  lines.push(
    "Rule 8"
  );
  lines.push(
    "- Run Project Validation."
  );
  lines.push("");

  lines.push(
    "Rule 9"
  );
  lines.push(
    "- Run Module Analyzer."
  );
  lines.push("");

  lines.push(
    "Rule 10"
  );
  lines.push(
    "- Run Function Analyzer."
  );
  lines.push("");

  lines.push(
    "Rule 11"
  );
  lines.push(
    "- Run AI Auto Test."
  );
  lines.push("");

  lines.push(
    "Rule 12"
  );
  lines.push(
    "- Verify Health Score before completion."
  );

  return lines.join("\n");

}

/* ===============================
   Recommended Repair Order Report
=============================== */

function buildRecommendedRepairOrderReport() {

  const database =
    getProjectFunctionDatabase();

  const lines = [];

  lines.push(
    "=== Recommended Repair Order ==="
  );

  lines.push("");

  if (
    !hasProjectFunctionDatabase(database)
  ) {
    lines.push(
      "skip: projectFunctionDatabase not loaded"
    );

    return lines.join("\n");
  }

  const priorityFunctions = [
    "getProjectAnalyzeSources",
    "buildProjectState",
    "updateProjectDatabase",
    "buildProjectDatabase",
    "showHtmlHealth",
    "executeProjectValidation",
    "generateModuleAnalyzer",
    "showFunctionAnalyzer",
    "analyzeAiGeneratedCode",
    "runAiAutoTest",
    "applyAiIntegration",
    "showAiHandoffReport"
  ];

  priorityFunctions
    .forEach((name, index) => {

      const info =
        database[name];

      if (!info) {
        return;
      }

      const called =
        getFunctionCalledList(info);

      const calledBy =
        getFunctionCalledByList(info);

      let risk =
        "LOW";

      if (
        calledBy.length >= 10 ||
        called.length >= 10
      ) {
        risk = "HIGH";
      } else if (
        calledBy.length >= 5 ||
        called.length >= 5
      ) {
        risk = "MEDIUM";
      }

      lines.push(
        String(index + 1) + ". " + name + "()"
      );

      lines.push(
        "File:"
      );

      lines.push(
        getFunctionFileName(info)
      );

      lines.push(
        "Risk:"
      );

      lines.push(
        risk
      );

      lines.push(
        "Reason:"
      );

      lines.push(
        "- called: " + called.length
      );

      lines.push(
        "- calledBy: " + calledBy.length
      );

      lines.push("");

    });

  return lines.join("\n");

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
   Build AI Report Manager HTML
=============================== */

function buildAiReportManagerHtml() {

  return `
<div class="float-panel-actions">

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

window.showAiReportManager =
  showAiReportManager;

window.generateSelectedAiReport =
  generateSelectedAiReport;

window.copySelectedAiReport =
  copySelectedAiReport;

console.log(
  "13_project_handoff loaded"
);