/* ===============================
   FILE: 01_function_reference.js
   Function Reference Analyzer
=============================== */

const APP_REGEX_PARTS = {
  jsName: "[a-zA-Z_$][a-zA-Z0-9_$]*"
};

function buildAppRegex(pattern, flags = "g") {
  return new RegExp(pattern, flags);
}

const APP_REGEX = {
  onclickFunction:
    buildAppRegex(
      `onclick\\s*=\\s*["']\\s*(${APP_REGEX_PARTS.jsName})\\s*\\(`
    ),

  addEventListenerFunction:
    buildAppRegex(
      `addEventListener\\s*\\([^)]*,\\s*(${APP_REGEX_PARTS.jsName})`
    ),

  windowAssignedFunction:
    buildAppRegex(
      `window\\.${APP_REGEX_PARTS.jsName}\\s*=\\s*(${APP_REGEX_PARTS.jsName})`
    ),

  windowAssignedName:
    buildAppRegex(
      `window\\.(${APP_REGEX_PARTS.jsName})\\s*=`
    ),

  labelFor:
    /for\s*=\s*["']([^"']+)["']/g,

  functionDeclaration:
    buildAppRegex(
      `(?:^|\\n)\\s*(?:async\\s+)?function\\s+(${APP_REGEX_PARTS.jsName})\\s*\\(`
    ),

  functionCall:
    buildAppRegex(
      `\\b(${APP_REGEX_PARTS.jsName})\\s*\\(`
    )
};