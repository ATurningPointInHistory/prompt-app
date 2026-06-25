/* ===============================
   FILE: 01_analyzer_common.js
   Analyzer Common Utilities
=============================== */

/* ===============================
   Ignored Function Calls
=============================== */

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
    "getItem",
    "removeItem",

    "stringify",
    "parse",

    "min",
    "max",

    "log",
    "warn",
    "error",

    "get",
    "add",
    "has",
    "push",

    "if",
    "return",
    "for",
    "while",
    "switch",
    "catch",

    "String",
    "Number",
    "Boolean",
    "Array",
    "Object",
    "JSON",
    "RegExp",
    "Map",
    "Set",
    "Promise",
    "Function",
    "Date",
    "Math",
    "Reflect",

    "setTimeout",
    "setInterval",
    "clearTimeout",
    "clearInterval",

    "isArray",
    "test",
    "resolve",
    "reject",
    "b",
    "keys",
    "values",
    "entries",
    "now",
    "startsWith",
    "endsWith"
  ]);

}

/* ===============================
   Called Functions From Blocks
=============================== */

function extractCalledFunctionsFromBlocks(
  blocks
) {

  const calls =
    new Set();

  (blocks || []).forEach(block => {

    const code =
      block.code ||
      block.block ||
      block.text ||
      "";

    if (!code) {
      return;
    }

    const list =
      typeof extractCalledFunctions === "function"
        ? extractCalledFunctions(code)
        : [];

    list.forEach(name => {
      calls.add(name);
    });

  });

  const ignore =
    typeof getIgnoredFunctionCalls === "function"
      ? getIgnoredFunctionCalls()
      : new Set();

  return [...calls]
    .filter(name =>
      name &&
      !ignore.has(name)
    )
    .sort();

}

/* ===============================
   Analyzer Called By
=============================== */

function buildAnalyzerCalledBy(
  fileName
) {

  const database =
    window.projectDatabase?.functions ||
    window.projectFunctionDatabase ||
    {};

  const result =
    new Set();

  Object.values(database)
    .forEach(fn => {

      if (
        fn.fileName !== fileName
      ) {
        return;
      }

      (fn.calledBy || [])
        .forEach(name => {
          result.add(name);
        });

    });

  return [...result].sort();

}

/* ===============================
   Analyzer Dependencies
=============================== */

function buildAnalyzerDependencies(
  calledFunctions,
  calledBy
) {

  return [
    ...new Set([
      ...(calledFunctions || []),
      ...(calledBy || [])
    ])
  ].sort();

}

/* ===============================
   Function Info Helpers
=============================== */

function getProjectFunctionDatabase() {

  return (
    window.projectDatabase?.functions ||
    window.projectFunctionDatabase ||
    {}
  );

}

/* ===============================
   Function Called List
=============================== */

function getFunctionCalledList(
  info
) {

  return (
    info?.called ||
    info?.calledFunctions ||
    []
  );

}

/* ===============================
   Has Project Function Database
=============================== */

function hasProjectFunctionDatabase(
  database = getProjectFunctionDatabase()
) {

  return Boolean(
    database &&
    Object.keys(database).length
  );

}

/* ===============================
   Function Called List
=============================== */

function getFunctionCalledList(
  info
) {

  return (
    info?.called ||
    info?.calledFunctions ||
    []
  );

}

/* ===============================
   Function Called By List
=============================== */

function getFunctionCalledByList(
  info
) {

  return (
    info?.calledBy ||
    []
  );

}

/* ===============================
   Function File Name
=============================== */

function getFunctionFileName(
  info
) {

  return (
    info?.file ||
    info?.fileName ||
    info?.path ||
    "unknown"
  );

}

/* ===============================
   Function Name
=============================== */

function getFunctionName(
  info
) {

  return (
    info?.name ||
    info?.functionName ||
    "unknown"
  );

}

/* ===============================
   Filter Self Function Calls
=============================== */
function filterSelfFunctionCalls(
  functionName,
  calls
) {

  const ignore =
    typeof getIgnoredFunctionCalls ===
      "function"
      ? getIgnoredFunctionCalls()
      : new Set();

  return (calls || [])
    .filter(name =>
      name &&
      name !== functionName &&
      !ignore.has(name)
    )
    .sort();

}

/* ===============================
   Global Export
=============================== */

window.getIgnoredFunctionCalls =
  getIgnoredFunctionCalls;

window.extractCalledFunctionsFromBlocks =
  extractCalledFunctionsFromBlocks;

window.buildAnalyzerCalledBy =
  buildAnalyzerCalledBy;

window.buildAnalyzerDependencies =
  buildAnalyzerDependencies;

console.log(
  "01_analyzer_common loaded"
);