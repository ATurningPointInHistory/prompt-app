/* ===============================
   FILE: 01_project_config.js
   Project Config
=============================== */

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
      priority: 70,
      words: [
        "mobile",
        "console",
        "log",
        "error",
        "eval"
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

function getIgnoredFunctionCalls() {

  return new Set([
    "alert",
    "confirm",
    "prompt",
    "trim",
    "filter",
    "map",
    "forEach",
    "find",
    "findIndex",
    "slice",
    "split",
    "join",
    "includes",
    "indexOf",
    "match",
    "matchAll",
    "replace",
    "toLowerCase",
    "toUpperCase",
    "querySelector",
    "querySelectorAll",
    "setItem",
    "stringify",
    "min",
    "max",
    "log",
    "get",
    "add",
    "has",
    "if",
    "return",
    "String",
    "RegExp",
    "Map",
    "Set",
    "push",
    "test",
    "b"
  ]);

}

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

function getProjectFunctionSearchFiles() {

  return [
    "./00_core.js",
    "./01_bootstrap.js",
    "./01_function_reference.js",
    "./01_project_config.js",

    "./02_prompt.js",
    "./03_data.js",
    "./04_tools.js",
    "./04_repair_quick_buttons.js",

    "./05_repair_file.js",
    "./05_repair_function.js",
    "./05_repair_sort.js",
    "./05_repair_diff.js",
    "./05_repair_cleanup.js",
    "./05_repair.js",

    "./06_search.js",

    "./07_health_dependency.js",
    "./07_health_diagnose.js",
    "./07_health_unused.js",
    "./07_backup_manager.js",
    "./07_project_package.js",
    "./07_safe_mode.js",
    "./07_backup_health.js",

    "./08_function_relation.js",
    "./08_ai_analyzer.js",
    "./08_ai_apply.js",
    "./08_ai_test.js",
    "./08_ai_integrator.js",

    "./09_ai_instruction.js",
    "./09_ai_error_prompt.js",

    "./10_macro.js",
    "./11_mobile_console.js",
    "./12_memo_box.js",

    "./99_init.js"
  ];

}

/* ===============================
状態管理関数
=============================== */

function setCurrentRepairFile(
  fileName
) {

  currentRepairFile =
    fileName || "";

  const label =
    get(
      "currentRepairFileLabel"
    );

  if (label) {
    label.textContent =
      currentRepairFile || "未選択";
  }
}