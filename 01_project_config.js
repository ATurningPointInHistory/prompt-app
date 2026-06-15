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
      file: "00_bootstrap.js",
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
      file: "01_core.js",
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
      file: "01_function_reference.js",
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
      file: "05_repair.js",
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
      words: [
        "search",
        "replace",
        "highlight",
        "cursor"
      ]
    },
    {
      file: "07_health_dependency.js",
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
      words: [
        "unused",
        "deletecandidate",
        "unusedfunction",
        "deletehistory"
      ]
    },
    {
      file: "07_backup_health.js",
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
      words: [
        "apply",
        "integrationdiff",
        "virtualtext",
        "replacecandidate"
      ]
    },
    {
      file: "08_ai_test.js",
      words: [
        "autotest",
        "sandbox",
        "testai",
        "healthscore"
      ]
    },
    {
      file: "08_ai_integrator.js",
      words: [
        "integration",
        "aicode",
        "generatedcode"
      ]
    },
    {
      file: "09_ai_instruction.js",
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
      file: "99_init.js",
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
      )

  };

}

/* ===============================
状態管理関数追加
=============================== */

let currentRepairFile = "";

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

    label.textContent
