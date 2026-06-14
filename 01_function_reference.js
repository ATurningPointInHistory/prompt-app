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

function extractFunctionReferences(
  text,
  html = text
) {

  const source =
    String(text || "");

  const htmlText =
    String(html || "");

  return {
    onclicks:
      [...htmlText.matchAll(APP_REGEX.onclickFunction)]
        .map(x => x[1]),

    eventRefs:
      [...source.matchAll(APP_REGEX.addEventListenerFunction)]
        .map(x => x[1]),

    windowRefs:
      [...source.matchAll(APP_REGEX.windowAssignedFunction)]
        .map(x => x[1]),

    windowNames:
      [...source.matchAll(APP_REGEX.windowAssignedName)]
        .map(x => x[1]),

    labelFors:
      [...htmlText.matchAll(APP_REGEX.labelFor)]
        .map(x => x[1])
  };
}

function countFunctionReferences(
  text,
  name,
  withCall = false
) {
  const source =
    String(text || "");

  const target =
    String(name || "");

  if (!target) {
    return 0;
  }

  const suffix =
    withCall
      ? "\\s*\\("
      : "";

  return (
    source.match(
      new RegExp(
        "\\b" +
        escapeRegExp(target) +
        "\\b" +
        suffix,
        "g"
      )
    ) || []
  ).length;
}