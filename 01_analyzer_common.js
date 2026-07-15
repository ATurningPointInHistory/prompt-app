/* ===============================
   FILE: 01_analyzer_common.js
   Analyzer Common Utilities
=============================== */

/* ===============================
   Ignored Function Calls
=============================== */

function getIgnoredFunctionCalls() {

  return new Set([

    /* ===============================
       Browser Global
    =============================== */

    "alert",
    "confirm",
    "prompt",

    "setTimeout",
    "setInterval",
    "clearTimeout",
    "clearInterval",

    "requestAnimationFrame",
    "cancelAnimationFrame",

    "fetch",

    "parseInt",
    "parseFloat",
    "isNaN",
    "isFinite",

    "encodeURI",
    "decodeURI",
    "encodeURIComponent",
    "decodeURIComponent",

    /* ===============================
       DOM
    =============================== */

    "createElement",
    "createTextNode",
    "createDocumentFragment",

    "appendChild",
    "removeChild",
    "replaceChild",
    "insertBefore",

    "append",
    "prepend",
    "before",
    "after",
    "remove",
    "replaceWith",

    "querySelector",
    "querySelectorAll",

    "getElementById",
    "getElementsByClassName",
    "getElementsByTagName",

    "closest",
    "matches",
    "contains",

    "setAttribute",
    "getAttribute",
    "removeAttribute",
    "hasAttribute",

    "addEventListener",
    "removeEventListener",
    "dispatchEvent",

    "focus",
    "blur",
    "click",
    "select",

    "scroll",
    "scrollTo",
    "scrollBy",
    "scrollIntoView",

    "execCommand",

    /* ===============================
       Storage
    =============================== */

    "setItem",
    "getItem",
    "removeItem",
    "clear",

    /* ===============================
       Array
    =============================== */

    "push",
    "pop",
    "shift",
    "unshift",

    "slice",
    "splice",

    "map",
    "filter",
    "forEach",
    "find",
    "findIndex",
    "some",
    "every",
    "reduce",
    "reduceRight",

    "includes",
    "indexOf",
    "lastIndexOf",

    "sort",
    "reverse",
    "concat",
    "flat",
    "flatMap",

    "join",

    /* ===============================
       String
    =============================== */

    "trim",
    "trimStart",
    "trimEnd",

    "split",
    "replace",
    "replaceAll",

    "match",
    "matchAll",
    "search",

    "includes",
    "indexOf",
    "lastIndexOf",

    "startsWith",
    "endsWith",

    "substring",
    "substr",

    "toLowerCase",
    "toUpperCase",

    "charAt",
    "charCodeAt",

    /* ===============================
       Object
    =============================== */

    "keys",
    "values",
    "entries",

    "assign",
    "create",

    "hasOwn",
    "hasOwnProperty",

    "getPrototypeOf",
    "setPrototypeOf",

    /* ===============================
       JSON
    =============================== */

    "stringify",
    "parse",

    /* ===============================
       Number / Math
    =============================== */

    "min",
    "max",
    "round",
    "floor",
    "ceil",
    "abs",
    "random",

    /* ===============================
       Date
    =============================== */

    "now",
    "toISOString",
    "toLocaleString",
    "toLocaleDateString",
    "toLocaleTimeString",

    /* ===============================
       Promise
    =============================== */

    "resolve",
    "reject",
    "then",
    "catch",
    "finally",
    "all",
    "allSettled",
    "race",
    "any",

    /* ===============================
       Set / Map
    =============================== */

    "get",
    "set",
    "add",
    "has",
    "delete",
    "clear",

    /* ===============================
       Console
    =============================== */

    "log",
    "warn",
    "error",
    "info",
    "debug",
    "table",
    "group",
    "groupEnd",

    /* ===============================
       RegExp
    =============================== */

    "test",
    "exec",

    /* ===============================
       File / URL
    =============================== */

    "createObjectURL",
    "revokeObjectURL",

    /* ===============================
       Constructors
    =============================== */

    "String",
    "Number",
    "Boolean",
    "Array",
    "Object",
    "JSON",
    "RegExp",
    "Map",
    "Set",
    "WeakMap",
    "WeakSet",
    "Promise",
    "Function",
    "Date",
    "Math",
    "Reflect",
    "URL",
    "Blob",
    "FileReader",
    "FormData",

    /* ===============================
       Analyzer Noise
    =============================== */

    "if",
    "return",
    "for",
    "while",
    "switch",
    "catch",

    "fn",
    "callback",
    "cb",
    "handler",
    "action",
    "task",
    "runner",
    "executor",
    "predicate",
    "mapper",
    "listener",

    "b",

    "structuredClone",
    "getComputedStyle",
    "DOMParser",
    "Error",
    "Event"

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

window.getProjectFunctionDatabase =
  getProjectFunctionDatabase;

window.getFunctionCalledList =
  getFunctionCalledList;

window.hasProjectFunctionDatabase =
  hasProjectFunctionDatabase;

window.getFunctionCalledByList =
  getFunctionCalledByList;

window.getFunctionFileName =
  getFunctionFileName;

window.getFunctionName =
  getFunctionName;

window.filterSelfFunctionCalls =
  filterSelfFunctionCalls;

console.log(
  "01_analyzer_common loaded"
);