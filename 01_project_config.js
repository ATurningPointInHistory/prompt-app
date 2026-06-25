/* ===============================
   FILE: 01_project_config.js
   Project Config
=============================== */

let repairSearchFileStore = {};

let currentProjectAnalyzeMode =
  "editor";

/* ===============================
   Project Info
   Project全体で共通利用する基本情報
=============================== */

const PROJECT_INFO = {

  name:
    "AIプロンプト生成Pro",

  version:
    "v6.0",

  entryFile:
    "index.html",

  projectState:
    "repairSearchFileStore",

  createdBy:
    "AI Prompt Generator Pro"

};

function getProjectConfig() {

  const saved =
    loadJson(
      "projectConfig",
      null
    );

  if (
    saved &&
    typeof saved === "object"
  ) {
    return normalizeProjectConfig(
      saved
    );
  }

  return normalizeProjectConfig(
    getDefaultProjectConfig()
  );

}

function getProjectModuleRules() {

  return [

    {
      file: "00_core.js",
      priority: 100,
      words: [
        "escape",
        "copy",
        "helper",
        "util",
        "safe",
        "config",
        "regex",
        "reference"
      ]
    },
    {
      file: "01_bootstrap.js",
      priority: 95,
      words: [
        "float",
        "panel",
        "menu",
        "bootstrap",
        "switchapp",
        "tab"
      ]
    },
    {
      file: "01_function_reference.js",
      priority: 85,
      words: [
        "reference",
        "onclick",
        "eventlistener",
        "windowassigned",
        "labelfor",
        "countfunctionreferences"
      ]
    },
    {
      file: "02_prompt.js",
      priority: 80,
      words: [
        "prompt",
        "review",
        "convert",
        "command",
        "generate"
      ]
    },
    {
      file: "03_data.js",
      priority: 85,
      words: [
        "save",
        "load",
        "history",
        "storage",
        "state"
      ]
    },
    {
      file: "04_tools.js",
      priority: 80,
      words: [
        "template",
        "danger",
        "pattern",
        "preset",
        "todo",
        "devlog"
      ]
    },
    {
      file: "04_repair_quick_buttons.js",
      priority: 90,
      words: [
        "favorite",
        "quick",
        "repairquick",
        "quickbutton",
        "quickfavorite"
      ]
    },
    {
      file: "05_repair.js",
      priority: 100,
      words: [
        "repair",
        "undo",
        "redo",
        "editor",
        "functionsort",
        "diff"
      ]
    },
    {
      file: "06_search.js",
      priority: 95,
      words: [
        "search",
        "replace",
        "highlight",
        "cursor"
      ]
    },
    {
      file: "07_health_dependency.js",
      priority: 100,
      words: [
        "dependency",
        "bracket",
        "scope",
        "duplicate",
        "garbage",
        "functiondependency"
      ]
    },
    {
      file: "07_health_diagnose.js",
      priority: 100,
      words: [
        "diagnose",
        "summary",
        "score",
        "healthscore",
        "htmlsummary"
      ]
    },
    {
      file: "07_health_unused.js",
      priority: 95,
      words: [
        "unused",
        "deletecandidate",
        "unusedfunction",
        "deletehistory"
      ]
    },
    {
      file: "07_backup_health.js",
      priority: 100,
      words: [
        "health",
        "showhtmlhealth",
        "safemode",
        "externalscript",
        "projectjshealth"
      ]
    },
    {
      file: "07_project_package.js",
      priority:90,
      words:[
        "package",
        "projectpackage",
        "zip",
        "exportproject"
      ]
    },
    {
      file: "07_backup_manager.js",
      priority: 95,
      words: [
        "backup",
        "restore",
        "programhtml",
        "saveprogram",
        "diffresult",
        "backuphistory"
      ]
    },
    {
      file: "08_function_relation.js",
      priority: 95,
      words: [
        "relation",
        "functionrelation",
        "calledby",
        "callmap",
        "graph"
      ]
    },
    {
      file: "08_ai_analyzer.js",
      priority: 100,
      words: [
        "aianalyzer",
        "classify",
        "integrationreport",
        "duplicatefunctions",
        "missingfunction"
      ]
    },
    {
      file: "08_ai_apply.js",
      priority: 100,
      words: [
        "apply",
        "integrationdiff",
        "virtualtext",
        "replacecandidate"
      ]
    },
    {
      file: "08_ai_test.js",
      priority: 100,
      words: [
        "autotest",
        "sandbox",
        "testai",
        "healthscore"
      ]
    },
    {
      file: "08_ai_integrator.js",
      priority: 100,
      words: [
        "integration",
        "aicode",
        "generatedcode"
      ]
    },
    {
      file: "09_ai_instruction.js",
      priority: 95,
      words: [
        "instruction",
        "aiinstruction",
        "buildaiinstructionreport",
        "beforeafter",
        "primarytarget",
        "replacecandidate"
      ]
    },
    {
      file: "09_ai_error_prompt.js",
      priority:95,
      words:[
        "errorprompt",
        "generateerrorprompt",
        "builderror",
        "repairhint",
        "extracterror"
      ]
    },
    {
      file: "10_macro.js",
      priority: 80,
      words: [
        "macro",
        "recordmacro",
        "runmacro",
        "macrostep"
      ]
    },
    {
      file: "11_mobile_console.js",
      priority: 90,
      words: [
        "devconsole",
        "mobileconsole",
        "console",
        "log",
        "error",
        "eval",
        "execute",
        "history",
        "favorite"
      ]
    },
    {
      file: "11_mobile_console_suggest.js",
      priority: 85,
      words: [
        "suggest",
        "autocomplete",
        "quick",
        "command",
        "candidate",
        "completion"
      ]
    },
    {
      file: "11_virtual_keyboard.js",
      priority: 80,
      words: [
        "virtual",
        "keyboard",
        "cursor",
        "insert",
        "backspace",
        "delete"
      ]
    },
    {
      file: "12_memo_box.js",
      priority: 60,
      words: [
        "memo",
        "memobox",
        "note"
      ]
    },
    {
      file: "99_init.js",
      priority: 100,
      words: [
        "init",
        "domcontentloaded",
        "startup",
        "loadsettings"
      ]
    }
  ];
}

/* ===============================
   AIが消してはいけない重要関数
=============================== */

function getCriticalFunctionNames() {

  return new Set([
    "loadSettings",
    "saveCurrentState",
    "initRepairIde",
    "loadRepairHtml",
    "saveRepairHtml",
    "showHtmlHealth",
    "validateBackupHtml",
    "applyAiIntegration",
    "runAiAutoTest",
    "rollbackLastDelete"
  ]);

}

/* ===============================
   修正保護対象
=============================== */

function getProtectedFunctionNames() {

  return new Set([
    "loadRepairHtml",
    "saveRepairHtml",
    "copyRepairHtml",
    "showHtmlHealth",
    "validateBackupHtml",
    "getHtmlSummary",
    "collectExternalScriptText",
    "checkSafeMode",
    "safeRun",
    "rollbackLastDelete",
    "saveDeleteRollbackSnapshot",
    "updateLineNumbers",
    "updateCursorPosition",
    "autoSaveRepairDraft",
    "initRepairIde",
    "loadSettings",
    "detectProtectedAiChanges",
    "getAllProtectedFunctionNames",
    "getProtectedFunctionNames"
  ]);
}

/* ===============================
   Health等で無視
=============================== */

function getSystemIgnoreFunctions() {

  return new Set([
    "diagnoseRepairHtml",
    "diagnoseHtml",
    "cleanupCandidates",
    "commentOutCleanupCandidates",
    "deleteCommentedCleanupBlocks",
    "moveFloatPanelBy",
    "saveCurrentAiAnswer",
    "editProjectState"
  ]);

}

/* ===============================
   ID無視
=============================== */

function getSystemIgnoreIds() {

  return new Set([
    "appPage",
    "repairPage",
    "floatPanel",
    "functionListBox",
    "diffResultBox",
    "diagnoseResultBox",
    "healthResultBox",
    "repairEditor"
  ]);

}

/* ===============================
   AIに見せたい代表関数
=============================== */

function getProjectCoreFunctions() {

  return [

    "getProjectAnalyzeSources",
    "buildProjectState",
    "updateProjectDatabase",
    "buildProjectDatabase",

    "showHtmlHealth",
    "validateBackupHtml",

    "loadRepairHtml",
    "openRepairTarget",

    "generateModuleAnalyzer",
    "showFunctionAnalyzer",

    "analyzeAiGeneratedCode",
    "runAiGeneratedCodeAnalysis",
    "runAiAutoTest",
    "applyAiIntegration"

  ];

}

const targetFunctions = [
  ...getProjectCoreFunctions(),
  "getHtmlHealthSource",
  "buildModuleAnalysis"
];

const targetFunctions = [
  ...getProjectCoreFunctions(),
  "getRepairSearchFiles",
  "registerRepairSearchFile",
  "updateLineNumbers",
  "updateCursorPosition"
];

const targetFunctions =
  getProjectCoreFunctions();

function getDefaultProjectConfig() {

  return {

    moduleRules:
      getProjectModuleRules(),

    functionSearchFiles:
      getProjectFunctionSearchFiles(),

    protectedFunctions:
      [...getProtectedFunctionNames()],

    ignoreFunctionCalls:
      [...getIgnoredFunctionCalls()],

    criticalFunctions:
      [...getCriticalFunctionNames()]

  };

}

function normalizeProjectConfig(config) {

  return {

    moduleRules:
      Array.isArray(
        config.moduleRules
      )
        ? config.moduleRules
        : getProjectModuleRules(),

    protectedFunctions:
      new Set(
        config.protectedFunctions ||
        [...getProtectedFunctionNames()]
      ),

    ignoreFunctionCalls:
      new Set(
        config.ignoreFunctionCalls ||
        [...getIgnoredFunctionCalls()]
      ),

    criticalFunctions:
      new Set(
        config.criticalFunctions ||
        [...getCriticalFunctionNames()]
      ),

    functionSearchFiles:
      Array.isArray(
        config.functionSearchFiles
      )
        ? config.functionSearchFiles
        : getProjectFunctionSearchFiles()

  };

}

/* ===============================
   Get Project Function Search Files
=============================== */

function getProjectFunctionSearchFiles() {

  if (
    typeof buildProjectState ===
      "function"
  ) {

    const jsFiles =
      buildProjectState()
        .js
        .map(file =>
          file.path
        )
        .filter(Boolean);

    if (jsFiles.length) {
      return jsFiles;
    }

  }

  return [
    "./00_core.js",
    "./01_project_config.js",
    "./01_project_manager.js",
    "./99_init.js"
  ];

}