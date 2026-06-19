/* ===============================
   FILE: 13_module_analyzer.js
   Module Analyzer
=============================== */

function extractModuleKeywords(code) {

  const names =
    extractFunctionNames(code);

  const words =
    new Set();

  names.forEach(name => {

    String(name)
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .split(/[^a-zA-Z0-9]+/)
      .forEach(word => {

        word =
          word
            .trim()
            .toLowerCase();

        if (word.length >= 3) {
          words.add(word);
        }

      });

  });

  return [...words].sort();

}

function extractCalledFunctionsFromBlocks(blocks) {

  const calls =
    new Set();

  blocks.forEach(block => {

    const list =
      extractCalledFunctions(
        block.code || ""
      );

    list.forEach(name => {
      calls.add(name);
    });

  });

  return [...calls].sort();

}

function buildModuleAnalysis(
  code,
  fileName = ""
) {

  const blocks =
    extractFunctionBlocksFromText(code);

  const result =
    splitTopLevelFunctions(blocks);

  const topLevel =
    result.topLevel;

  const nested =
    result.nested;

  const keywords =
    extractModuleKeywords(code);

  const calledFunctions =
    extractCalledFunctionsFromBlocks(topLevel);

  const lines = [];

  lines.push("MODULE ANALYSIS");
  lines.push("");

  lines.push("=== File ===");
  lines.push(fileName || "unknown");
  lines.push("");

  lines.push("=== Function Count ===");
  lines.push(String(topLevel.length + nested.length));
  lines.push("");

  lines.push("=== Top Level Count ===");
  lines.push(String(topLevel.length));
  lines.push("");

  lines.push("=== Nested Count ===");
  lines.push(String(nested.length));
  lines.push("");

  lines.push("=== Keywords ===");
  lines.push(
    keywords.length
      ? keywords.join(", ")
      : "none"
  );
  lines.push("");

  lines.push("=== Called Functions ===");
  lines.push(
    calledFunctions.length
      ? calledFunctions.join("\n")
      : "none"
  );
  lines.push("");

  lines.push("=== Top Level Functions ===");
  lines.push(
    topLevel.length
      ? topLevel.map(block => block.name).join("\n")
      : "none"
  );
  lines.push("");

  lines.push("=== Nested Functions ===");
  lines.push(
    nested.length
      ? nested.map(block => block.name).join("\n")
      : "none"
  );

  return lines.join("\n");

}

window.extractModuleKeywords =
  extractModuleKeywords;

window.extractCalledFunctionsFromBlocks =
  extractCalledFunctionsFromBlocks;

window.buildModuleAnalysis =
  buildModuleAnalysis;

console.log(
  "13_module_analyzer loaded"
);