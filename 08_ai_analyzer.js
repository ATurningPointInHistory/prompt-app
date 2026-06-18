/* ===============================
   FILE: 08_ai_analyzer.js
   AI Code Analyzer
=============================== */

function classifyAiChanges(
  functionName = "",
  options = {}
) {

  const name =
    String(functionName || "")
      .toLowerCase();

  const code =
    String(options.code || "");

  const currentBlock =
    options.currentBlock || null;

  const currentFile =
    String(
      options.currentFile ||
      currentRepairFile ||
      ""
    );

  const targetComment =
    code.match(
      /\/\/\s*targetFile\s*:\s*([a-zA-Z0-9_.\-\/]+\.js)/
    );

  if (targetComment) {
    return {
      file: targetComment[1],
      score: 99,
      reason: "targetFile comment"
    };
  }

  if (
    currentBlock &&
    currentFile
  ) {
    return {
      file: currentFile,
      score: 90,
      reason: "existing function file"
    };
  }

  const config =
    typeof getProjectConfig === "function"
      ? getProjectConfig()
      : {};

  const rules =
    Array.isArray(config.moduleRules)
      ? config.moduleRules
      : [];

  let bestFile =
    "unknown";

  let bestScore =
    0;

  rules.forEach(rule => {

    let score = 0;

    const words =
      Array.isArray(rule.words)
        ? rule.words
        : [];

    words.forEach(word => {
      if (name.includes(word)) {
        score++;
      }
    });

    if (score > bestScore) {
      bestScore = score;
      bestFile =
        rule.file || "unknown";
    }
  });

  return {
    file: bestFile,
    score: bestScore,
    reason:
      bestScore > 0
        ? "keyword"
        : "unknown"
  };
}

function filterTopLevelFunctionBlocks(
  blocks
) {

  return blocks.filter(block => {

    if (block.type !== "function") {
      return false;
    }

    const parent =
      blocks.find(other =>
        other !== block &&
        other.type === "function" &&
        other.start < block.start &&
        other.end > block.end
      );

    return !parent;

  });

}

function detectAiInputDuplicateFunctions() {

  if (
    !latestAiIntegrationChanges ||
    !latestAiIntegrationChanges.length
  ) {
    return [];
  }

  const names =
    latestAiIntegrationChanges.map(
      x => x.name
    );

  return [
    ...new Set(
      names.filter(
        (name, index) =>
          names.indexOf(name) !== index
      )
    )
  ];
}

function buildAiIntegrationReport(changes) {

  const add =
    changes.filter(x => x.type === "add");

  const replace =
    changes.filter(x => x.type === "replace");

  const same =
    changes.filter(x => x.type === "same");

  const lines = [];

  lines.push("AI Code Integration Report");
  lines.push("");
  lines.push("=== Summary ===");
  lines.push("add: " + add.length);
  lines.push("replace: " + replace.length);
  lines.push("same: " + same.length);
  lines.push("");

  lines.push("=== Add Function ===");

  lines.push(
    add.length
      ? add.map(x => {

          return (
            "＋ " +
            x.name +
            "\n→ " +
            (x.targetFile || "unknown") +
            "\nscore: " +
            (x.targetScore ?? 0) +
            "\nreason: " +
            (x.targetReason || "unknown")
          );

        }).join("\n\n")
      : "none"
  );

  lines.push("");

  lines.push("=== Replace Function ===");

  lines.push(
    replace.length
      ? replace.map(x => {

          return (
            "⚠ " +
            x.name +
            " / L" +
            x.line +
            "\n→ " +
            (x.targetFile || "unknown") +
            "\nscore: " +
            (x.targetScore ?? 0) +
            "\nreason: " +
            (x.targetReason || "unknown")
          );

        }).join("\n\n")
      : "none"
  );

  lines.push("");

  lines.push("=== Same Function ===");

  lines.push(
    same.length
      ? same.map(x => {

          return (
            "＝ " +
            x.name +
            "\n→ " +
            (x.targetFile || "unknown") +
            "\nscore: " +
            (x.targetScore ?? 0) +
            "\nreason: " +
            (x.targetReason || "unknown")
          );

        }).join("\n\n")
      : "none"
  );

  return lines.join("\n");
}

function detectMissingFunctionCallsInText(text) {

  const funcs =
    extractFunctionNames(text);

  const config =
    typeof getProjectConfig === "function"
      ? getProjectConfig()
      : {};

  const ignore =
    new Set(
      config.ignoreFunctionCalls || []
    );

  const calls =
    [...text.matchAll(
      /\b([a-zA-Z_$][\w$]*)\s*\(/g
    )].map(m => m[1]);

  return [
    ...new Set(
      calls.filter(name =>
        !funcs.includes(name) &&
        !ignore.has(name)
      )
    )
  ];
}

function detectProtectedAiChanges() {

  if (
    !latestAiIntegrationChanges ||
    !latestAiIntegrationChanges.length
  ) {
    return [];
  }

  const protectedNames =
    getAllProtectedFunctionNames();

  return latestAiIntegrationChanges
    .filter(change => {

      if (change.type !== "replace") {
        return false;
      }

      return protectedNames.has(
        change.name
      );

    })
    .map(change => change.name);

}

function detectMissingCriticalFunctionsInText(text) {

  const funcs =
    extractFunctionNames(text);

  const config =
    typeof getProjectConfig === "function"
      ? getProjectConfig()
      : {};

  const critical =
    config.criticalFunctions ||
    new Set();

  return [
    ...critical
  ].filter(name =>
    !funcs.includes(name)
  );

}

function extractCalledFunctions(code) {

  const ignore =
    typeof getIgnoredFunctionCalls === "function"
      ? getIgnoredFunctionCalls()
      : new Set();

  return [
    ...new Set(
      [...String(code || "").matchAll(
        /\b([a-zA-Z_$][\w$]*)\s*\(/g
      )]
      .map(x => x[1])
      .filter(name =>
        !ignore.has(name)
      )
    )
  ];

}

function buildFunctionDependencyScore(
  calledFunctions,
  moduleRule
) {

  if (
    !moduleRule ||
    !Array.isArray(moduleRule.words)
  ) {
    return 0;
  }

  let score = 0;

  const file =
    String(moduleRule.file || "")
      .toLowerCase();

  const words =
    moduleRule.words.map(word =>
      String(word || "")
        .toLowerCase()
    );

  calledFunctions.forEach(name => {

    const lowerName =
      String(name || "")
        .toLowerCase();

    words.forEach(word => {

      if (
        lowerName.includes(word)
      ) {
        score += 5;
      }

    });

    if (
      file.includes("repair") &&
      lowerName.includes("repair")
    ) {
      score += 10;
    }

    if (
      file.includes("search") &&
      lowerName.includes("search")
    ) {
      score += 10;
    }

    if (
      file.includes("macro") &&
      lowerName.includes("macro")
    ) {
      score += 10;
    }

    if (
      file.includes("health") &&
      (
        lowerName.includes("health") ||
        lowerName.includes("diagnose")
      )
    ) {
      score += 10;
    }

    if (
      file.includes("ai") &&
      lowerName.includes("ai")
    ) {
      score += 10;
    }

  });

  return score;

}

function detectBestModuleFromCalls(
  calledFunctions
) {

  const rules =
    getProjectModuleRules();

  let best = {
    file: "unknown",
    score: 0
  };

  rules.forEach(rule => {

    const score =
      buildFunctionDependencyScore(
        calledFunctions,
        rule
      );

    if (
      score > best.score
    ) {

      best = {

        file: rule.file,

        score

      };

    }

  });

  return best;

}