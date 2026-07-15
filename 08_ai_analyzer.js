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

/* ===============================
   Analyzer Character Helpers
=============================== */

function isAnalyzerLineCommentStart(
  current,
  next
) {

  return (
    current === "/" &&
    next === "/"
  );

}

function isAnalyzerBlockCommentStart(
  current,
  next
) {

  return (
    current === "/" &&
    next === "*"
  );

}

function isAnalyzerBlockCommentEnd(
  current,
  next
) {

  return (
    current === "*" &&
    next === "/"
  );

}

function getAnalyzerStringState(
  character
) {

  if (
    character === "'"
  ) {
    return "single-string";
  }

  if (
    character === "\""
  ) {
    return "double-string";
  }

  if (
    character === "`"
  ) {
    return "template-string";
  }

  return "";

}

function getAnalyzerStringEndCharacter(
  state
) {

  if (
    state === "single-string"
  ) {
    return "'";
  }

  if (
    state === "double-string"
  ) {
    return "\"";
  }

  if (
    state === "template-string"
  ) {
    return "`";
  }

  return "";

}

function getAnalyzerMaskedCharacter(
  character
) {

  return (
    character === "\n"
      ? "\n"
      : " "
  );

}

/* ===============================
   Consume Analyzer Code Character
=============================== */

function consumeAnalyzerCodeCharacter(
  source,
  index
) {

  const current =
    source[index];

  const next =
    source[index + 1] ||
    "";

  if (
    isAnalyzerLineCommentStart(
      current,
      next
    )
  ) {

    return {

      text:
        "  ",

      nextIndex:
        index + 2,

      nextState:
        "line-comment"

    };

  }

  if (
    isAnalyzerBlockCommentStart(
      current,
      next
    )
  ) {

    return {

      text:
        "  ",

      nextIndex:
        index + 2,

      nextState:
        "block-comment"

    };

  }

  const stringState =
    getAnalyzerStringState(
      current
    );

  if (stringState) {

    return {

      text:
        " ",

      nextIndex:
        index + 1,

      nextState:
        stringState

    };

  }

  return {

    text:
      current,

    nextIndex:
      index + 1,

    nextState:
      "code"

  };

}

/* ===============================
   Consume Analyzer Line Comment
=============================== */

function consumeAnalyzerLineComment(
  source,
  index
) {

  const current =
    source[index];

  if (
    current === "\n"
  ) {

    return {

      text:
        "\n",

      nextIndex:
        index + 1,

      nextState:
        "code"

    };

  }

  return {

    text:
      " ",

    nextIndex:
      index + 1,

    nextState:
      "line-comment"

  };

}

/* ===============================
   Consume Analyzer Block Comment
=============================== */

function consumeAnalyzerBlockComment(
  source,
  index
) {

  const current =
    source[index];

  const next =
    source[index + 1] ||
    "";

  if (
    isAnalyzerBlockCommentEnd(
      current,
      next
    )
  ) {

    return {

      text:
        "  ",

      nextIndex:
        index + 2,

      nextState:
        "code"

    };

  }

  return {

    text:
      getAnalyzerMaskedCharacter(
        current
      ),

    nextIndex:
      index + 1,

    nextState:
      "block-comment"

  };

}

/* ===============================
   Consume Analyzer String
=============================== */

function consumeAnalyzerString(
  source,
  index,
  state
) {

  const current =
    source[index];

  if (
    current === "\\"
  ) {

    const next =
      source[index + 1] ||
      "";

    return {

      text:
        " " +
        getAnalyzerMaskedCharacter(
          next
        ),

      nextIndex:
        index + 2,

      nextState:
        state

    };

  }

  const endCharacter =
    getAnalyzerStringEndCharacter(
      state
    );

  if (
    current ===
    endCharacter
  ) {

    return {

      text:
        " ",

      nextIndex:
        index + 1,

      nextState:
        "code"

    };

  }

  return {

    text:
      getAnalyzerMaskedCharacter(
        current
      ),

    nextIndex:
      index + 1,

    nextState:
      state

  };

}

/* ===============================
   Consume Analyzer Character
=============================== */

function consumeAnalyzerCharacter(
  source,
  index,
  state
) {

  if (
    state === "code"
  ) {

    return consumeAnalyzerCodeCharacter(
      source,
      index
    );

  }

  if (
    state ===
    "line-comment"
  ) {

    return consumeAnalyzerLineComment(
      source,
      index
    );

  }

  if (
    state ===
    "block-comment"
  ) {

    return consumeAnalyzerBlockComment(
      source,
      index
    );

  }

  return consumeAnalyzerString(
    source,
    index,
    state
  );

}

/* ===============================
   Strip Analyzer Non-Code Text
=============================== */

function stripAnalyzerNonCodeText(
  code
) {

  const source =
    String(
      code || ""
    );

  let result = "";

  let index = 0;

  let state =
    "code";

  while (
    index <
    source.length
  ) {

    const consumed =
      consumeAnalyzerCharacter(
        source,
        index,
        state
      );

    result +=
      consumed.text;

    index =
      consumed.nextIndex;

    state =
      consumed.nextState;

  }

  return result;

}

/* ===============================
   Read Template Expression
=============================== */

function readAnalyzerTemplateExpression(
  source,
  startIndex
) {

  let index =
    startIndex;

  let depth =
    1;

  let state =
    "code";

  let result =
    "";

  while (
    index <
    source.length
  ) {

    const current =
      source[index];

    const next =
      source[index + 1] ||
      "";

    if (
      state === "code"
    ) {

      if (
        current === "'" ||
        current === "\"" ||
        current === "`"
      ) {

        state =
          current === "'"
            ? "single-string"
            : (
                current === "\""
                  ? "double-string"
                  : "template-string"
              );

        result +=
          current;

        index++;

        continue;

      }

      if (
        current === "/" &&
        next === "/"
      ) {

        state =
          "line-comment";

        result +=
          "  ";

        index += 2;

        continue;

      }

      if (
        current === "/" &&
        next === "*"
      ) {

        state =
          "block-comment";

        result +=
          "  ";

        index += 2;

        continue;

      }

      if (
        current === "{"
      ) {

        depth++;

        result +=
          current;

        index++;

        continue;

      }

      if (
        current === "}"
      ) {

        depth--;

        if (
          depth === 0
        ) {

          return {

            code:
              result,

            nextIndex:
              index + 1

          };

        }

        result +=
          current;

        index++;

        continue;

      }

      result +=
        current;

      index++;

      continue;

    }

    if (
      state ===
      "line-comment"
    ) {

      if (
        current === "\n"
      ) {

        state =
          "code";

        result +=
          "\n";

      } else {

        result +=
          " ";

      }

      index++;

      continue;

    }

    if (
      state ===
      "block-comment"
    ) {

      if (
        current === "*" &&
        next === "/"
      ) {

        state =
          "code";

        result +=
          "  ";

        index += 2;

        continue;

      }

      result +=
        getAnalyzerMaskedCharacter(
          current
        );

      index++;

      continue;

    }

    const endCharacter =
      getAnalyzerStringEndCharacter(
        state
      );

    if (
      current === "\\"
    ) {

      result +=
        " ";

      if (
        index + 1 <
        source.length
      ) {

        result +=
          getAnalyzerMaskedCharacter(
            source[index + 1]
          );

      }

      index += 2;

      continue;

    }

    if (
      current ===
      endCharacter
    ) {

      result +=
        current;

      state =
        "code";

      index++;

      continue;

    }

    result +=
      getAnalyzerMaskedCharacter(
        current
      );

    index++;

  }

  return {

    code:
      result,

    nextIndex:
      source.length

  };

}

/* ===============================
   Extract Template Expression Code
=============================== */

function extractAnalyzerTemplateExpressionCode(
  code
) {

  const source =
    String(
      code || ""
    );

  const expressions =
    [];

  let index = 0;

  let state =
    "code";

  while (
    index <
    source.length
  ) {

    const current =
      source[index];

    const next =
      source[index + 1] ||
      "";

    if (
      state === "code"
    ) {

      if (
        current === "'"
      ) {

        state =
          "single-string";

        index++;

        continue;

      }

      if (
        current === "\""
      ) {

        state =
          "double-string";

        index++;

        continue;

      }

      if (
        current === "`"
      ) {

        state =
          "template-string";

        index++;

        continue;

      }

      index++;

      continue;

    }

    if (
      state ===
        "single-string" ||
      state ===
        "double-string"
    ) {

      const endCharacter =
        getAnalyzerStringEndCharacter(
          state
        );

      if (
        current === "\\"
      ) {

        index += 2;

        continue;

      }

      if (
        current ===
        endCharacter
      ) {

        state =
          "code";

      }

      index++;

      continue;

    }

    if (
      state ===
      "template-string"
    ) {

      if (
        current === "\\"
      ) {

        index += 2;

        continue;

      }

      if (
        current === "`"
      ) {

        state =
          "code";

        index++;

        continue;

      }

      if (
        current === "$" &&
        next === "{"
      ) {

        const expression =
          readAnalyzerTemplateExpression(
            source,
            index + 2
          );

        expressions.push(
          expression.code
        );

        index =
          expression.nextIndex;

        continue;

      }

      index++;

      continue;

    }

  }

  return expressions
    .join("\n");

}

/* ===============================
   Analyzer Call Helpers
=============================== */

function isAnalyzerMemberCall(
  source,
  nameIndex
) {

  if (
    nameIndex <= 0
  ) {
    return false;
  }

  const before =
    source.slice(
      0,
      nameIndex
    );

  return (
    /\.\s*$/.test(
      before
    ) ||
    /\?\.\s*$/.test(
      before
    )
  );

}

function isAnalyzerFunctionDeclaration(
  source,
  nameIndex
) {

  const before =
    source.slice(
      Math.max(
        0,
        nameIndex - 40
      ),
      nameIndex
    );

  return (
    /\bfunction\s*$/.test(
      before
    )
  );

}

/* ===============================
   Find Analyzer Closing Parenthesis
=============================== */

function findAnalyzerClosingParenthesis(
  source,
  openIndex
) {

  let depth = 0;

  for (
    let index = openIndex;
    index < source.length;
    index++
  ) {

    const character =
      source[index];

    if (
      character === "("
    ) {

      depth++;

      continue;

    }

    if (
      character === ")"
    ) {

      depth--;

      if (
        depth === 0
      ) {
        return index;
      }

    }

  }

  return -1;

}

/* ===============================
   Analyzer Method Definition
=============================== */

function isAnalyzerMethodDefinition(
  source,
  match
) {

  if (
    !match ||
    typeof match.index !==
      "number"
  ) {
    return false;
  }

  const matchedText =
    String(
      match[0] || ""
    );

  const relativeOpenIndex =
    matchedText.lastIndexOf(
      "("
    );

  if (
    relativeOpenIndex < 0
  ) {
    return false;
  }

  const openIndex =
    match.index +
    relativeOpenIndex;

  const closeIndex =
    findAnalyzerClosingParenthesis(
      source,
      openIndex
    );

  if (
    closeIndex < 0
  ) {
    return false;
  }

  let nextIndex =
    closeIndex + 1;

  while (
    nextIndex <
      source.length &&
    /\s/.test(
      source[nextIndex]
    )
  ) {

    nextIndex++;

  }

  return (
    source[nextIndex] ===
    "{"
  );

}

function isAnalyzerControlCall(
  name
) {

  return new Set([
    "if",
    "for",
    "while",
    "switch",
    "catch",
    "with"
  ]).has(
    name
  );

}

function shouldIgnoreAnalyzerCall(
  source,
  match,
  ignore
) {

  const name =
    String(
      match?.[1] || ""
    );

  const nameIndex =
    Number(
      match?.index || 0
    );

  if (!name) {
    return true;
  }

  if (
    isAnalyzerMemberCall(
      source,
      nameIndex
    )
  ) {
    return true;
  }

  if (
    isAnalyzerFunctionDeclaration(
      source,
      nameIndex
    )
  ) {
    return true;
  }

  if (
    isAnalyzerMethodDefinition(
      source,
      match
    )
  ) {
    return true;
  }

  if (
    isAnalyzerControlCall(
      name
    )
  ) {
    return true;
  }

  if (
    ignore.has(name)
  ) {
    return true;
  }

  return false;

}

/* ===============================
   Extract Called Functions
=============================== */

function extractCalledFunctions(
  code
) {

  const normalCode =
    stripAnalyzerNonCodeText(
      code
    );

  const templateCode =
    extractAnalyzerTemplateExpressionCode(
      code
    );

  const source = [
    normalCode,
    stripAnalyzerNonCodeText(
      templateCode
    )
  ].join("\n");

  const ignore =
    typeof getIgnoredFunctionCalls ===
    "function"
      ? getIgnoredFunctionCalls()
      : new Set();

  const calls =
    new Set();

  const pattern =
    /\b([a-zA-Z_$][\w$]*)\s*\(/g;

  let match;

  while (
    (
      match =
        pattern.exec(source)
    )
  ) {

    if (
      shouldIgnoreAnalyzerCall(
        source,
        match,
        ignore
      )
    ) {
      continue;
    }

    calls.add(
      String(
        match[1]
      )
    );

  }

  return [
    ...calls
  ].sort();

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

window.stripAnalyzerNonCodeText =
  stripAnalyzerNonCodeText;

window.extractCalledFunctions =
  extractCalledFunctions;

window.extractAnalyzerTemplateExpressionCode =
  extractAnalyzerTemplateExpressionCode;