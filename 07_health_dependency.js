/* ===============================
   FILE: 07_health_dependency.js
   Function Dependency
=============================== */

function detectBracketMismatch(text) {
  const issues = [];
  const stack = [];

  const openers = {
    "(": ")",
    "[": "]",
    "{": "}"
  };

  const closers = {
    ")": "(",
    "]": "[",
    "}": "{"
  };

  let line = 1;
  let col = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === "\n") {
      line++;
      col = 0;
      continue;
    }

    col++;

    if (openers[ch]) {
      stack.push({
        ch,
        line,
        col
      });
      continue;
    }

    if (closers[ch]) {
      const last = stack.pop();

      if (!last || last.ch !== closers[ch]) {
        issues.push(
          "括弧不一致疑い: " +
          ch +
          " が余分 line " +
          line +
          ", col " +
          col
        );
      }
    }
  }

  stack.forEach(item => {
    issues.push(
      "括弧閉じ忘れ疑い: " +
      item.ch +
      " line " +
      item.line +
      ", col " +
      item.col
    );
  });

  return issues;
}

function detectFunctionBlockBracketIssues(text) {

  const issues = [];

  if (
    typeof extractFunctionBlocksFromText !==
    "function"
  ) {
    return issues;
  }

  const blocks =
    extractFunctionBlocksFromText(text);

  blocks.forEach(block => {

    const bracketIssues =
      detectBracketMismatch(
        block.block
      );

    bracketIssues.forEach(issue => {

      issues.push(
        block.name +
        ": " +
        issue
      );

    });

  });

  return issues;
}

function extractTemplateStrings(text) {
  const source = String(text || "");
  const results = [];

  const reg = /`([\s\S]*?)`/g;
  let match;

  while ((match = reg.exec(source)) !== null) {
    results.push({
      text: match[1],
      start: match.index
    });
  }

  return results;
}

  const issues = [];
  const templates =
    extractTemplateStrings(text);

  templates.forEach((item, index) => {
    const html = item.text;

    const divOpen =
      (html.match(/<div\b/gi) || []).length;

    const divClose =
      (html.match(/<\/div>/gi) || []).length;

    if (divOpen !== divClose) {
      issues.push(
        "template HTML div不一致: template#" +
        (index + 1) +
        " open:" +
        divOpen +
        " close:" +
        divClose
      );
    }
  });

  return issues;
}

function getErrorContext(
  source,
  line,
  radius = 5
) {

  if (!line) {
    return "";
  }

  const lines =
    String(source || "")
      .split("\n");

  const start =
    Math.max(
      0,
      line - radius - 1
    );

  const end =
    Math.min(
      lines.length,
      line + radius
    );

  const result = [];

  for (
    let i = start;
    i < end;
    i++
  ) {

    const prefix =
      i + 1 === line
        ? ">>> "
        : "    ";

    result.push(
      prefix +
      (i + 1) +
      ": " +
      lines[i]
    );
  }

  return result.join("\n");
}

function detectScopeLeakIssues(text) {
  const issues = [];

  // JS構文が正常ならスコープ診断は不要
  // 誤検知が多いため、構文エラー時のみ補助診断として使う
  try {
    new Function(String(text || ""));
    return issues;
  } catch {
    // 構文NG時だけ下の簡易検出を続行
  }

  const source =
    String(text || "");

  const reg =
    /\b(?:try|if|for|while)\s*\([^)]*\)?\s*\{([\s\S]*?)\}\s*[\s\S]{0,300}?(return\s*\{[\s\S]*?\}|return[\s\S]*?;)/g;

  let m;

  while ((m = reg.exec(source)) !== null) {

    const blockText = m[1];
    const afterText = m[2];

    const matches =
      [...blockText.matchAll(
        /\bconst\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g
      )];

    matches.forEach(match => {
      const name = match[1];

      const usedAfter =
        new RegExp(
          "\\b" + escapeRegExp(name) + "\\b"
        ).test(afterText);

      if (usedAfter) {
        const before =
          source.slice(
            0,
            m.index + match.index
          );

        const line =
          before.split("\n").length;

        issues.push(
          "スコープ外参照疑い: " +
          name +
          " line " +
          line
        );
      }
    });
  }

  return issues;
}

function detectDuplicateDeclsInFunctions(text) {

  const issues = [];

  if (typeof extractCodeBlocksFromText !== "function") {
    return issues;
  }

  const functionBlocks =
    extractCodeBlocksFromText(text)
      .filter(
        b =>
          b.type === "function" ||
          b.type === "async function"
      );

  functionBlocks.forEach(block => {

    const decls = {};

    const reg =
      /\b(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;

    let m;

    while ((m = reg.exec(block.block)) !== null) {

      const name = m[2];

      decls[name] =
        (decls[name] || 0) + 1;

      if (decls[name] === 2) {
        issues.push(
          `${block.name}: 二重定義疑い: ${name}`
        );
      }
    }
  });

  return issues;
}

function buildFunctionDependencyReport(source) {

  const text =
    String(source || "");

  const functionBlocks =
    typeof extractFunctionBlocksFromText === "function"
      ? extractFunctionBlocksFromText(text)
      : [];

  const uniqueFuncs =
    [...new Set(
      functionBlocks.map(item => item.name)
    )];

  const blockMap =
    new Map();

  functionBlocks.forEach(block => {
    if (!blockMap.has(block.name)) {
      blockMap.set(block.name, block);
    }
  });

  const refs =
    extractFunctionReferences(
      text,
      text
    );
  
  const onclicks =
    refs.onclicks;
  
  const eventRefs =
    refs.eventRefs;
  
  const windowRefs =
    refs.windowNames;

  const domReadyRefs =
    [...text.matchAll(
      /DOMContentLoaded[\s\S]{0,500}?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g
    )].map(x => x[1]);

  const config =
    typeof getProjectConfig === "function"
      ? getProjectConfig()
      : {};

  const protectedFunctions =
    new Set([
      ...(
        config.protectedFunctions || []
      ),
      ...(
        config.criticalFunctions || []
      )
    ]);

  const result = [];

  const unused = [];

  uniqueFuncs.forEach(fn => {

    const block =
      blockMap.get(fn);

    const body =
      block
        ? block.block
        : "";

    const calls =
      uniqueFuncs.filter(other => {

        if (other === fn) return false;

        return new RegExp(
          "\\b" +
          escapeRegExp(other) +
          "\\s*\\(",
          "g"
        ).test(body);

      });

    const directCallCount =
      countFunctionReferences(
        text,
        fn,
        true
      );

    const usedByOnclick =
      onclicks.includes(fn);

    const usedByEvent =
      eventRefs.includes(fn);

    const usedByWindow =
      windowRefs.includes(fn);

    const usedByDomReady =
      domReadyRefs.includes(fn);

    const isUnused =
      directCallCount <= 1 &&
      !usedByOnclick &&
      !usedByEvent &&
      !usedByWindow &&
      !usedByDomReady &&
      !protectedFunctions.has(fn);

    if (isUnused) {
    
      const line = text
        .slice(
          0,
          block
            ? block.start
            : 0
        )
        .split("\n")
        .length;
    
      unused.push({
        name: fn,
        line
      });
    
      return;
    }

    const info = [];

    info.push(
      "used:" + directCallCount
    );

    if (calls.length) {
      info.push(
        "calls:" + calls.join(", ")
      );
    }

    if (usedByOnclick) info.push("onclick");
    if (usedByEvent) info.push("event");
    if (usedByWindow) info.push("window");
    if (usedByDomReady) info.push("domReady");

    result.push(
`${fn}
${info.join("\n")}`
    );

  });

healthUnusedFunctions =
    [...unused];

  return [
    "",
    "=== Active Functions ===",
    "",
    result.length
      ? result.join("\n\n")
      : "none",
    "",
    "=== Unused Candidate ===",
    "",
    unused.length
      ? unused
          .map(
            item =>
              `${item.name} (L${item.line})`
          )
          .join("\n")
      : "none",
    ""
  ].join("\n");
}