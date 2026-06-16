/* ===============================
   FILE: 05_repair_function.js
   Repair Function / Code Block Tools
=============================== */

function findFunctionBlock(functionName) {
  const editor = get("repairEditor");

  if (!editor) {
    return null;
  }

  const result =
    findFunctionBlockInText(
      editor.value,
      functionName
    );

  if (!result) {
    alert("関数が見つかりません");
    return null;
  }

  return result;
}

function findFunctionBlockInText(text, functionName) {

  const source =
    String(text || "");

  const name =
    escapeRegExp(functionName);

  const patterns = [
    new RegExp(
      "\\b(?:async\\s+)?function\\s+" +
      name +
      "\\s*\\(",
      "g"
    ),
    new RegExp(
      "\\b(?:const|let|var)\\s+" +
      name +
      "\\s*=\\s*(?:async\\s*)?\\([^)]*\\)\\s*=>\\s*\\{",
      "g"
    ),
    new RegExp(
      "\\b(?:const|let|var)\\s+" +
      name +
      "\\s*=\\s*(?:async\\s*)?[a-zA-Z0-9_$]+\\s*=>\\s*\\{",
      "g"
    ),
    new RegExp(
      "\\b(?:const|let|var)\\s+" +
      name +
      "\\s*=\\s*(?:async\\s+)?function\\s*\\(",
      "g"
    ),
    new RegExp(
      "\\bwindow\\." +
      name +
      "\\s*=\\s*(?:async\\s+)?function\\s*\\(",
      "g"
    )
  ];

  for (const regex of patterns) {
    const match =
      regex.exec(source);

    if (!match) continue;

    const start =
      match.index;

    const braceStart =
      source.indexOf(
        "{",
        start
      );

    if (braceStart === -1) continue;

    const block =
      findBraceBlockFromPosition(
        source,
        start,
        braceStart
      );

    if (!block) continue;

    return {
      start,
      end: block.end,
      block:
        source.slice(
          start,
          block.end
        )
    };
  }

  return null;
}

function selectFunctionBlock(){
  const name=
    prompt("関数名");
  if(!name)return;
  const result=
    findFunctionBlock(name);
  if(!result)return;
  const editor=
    get("repairEditor");
  editor.focus();
  editor.setSelectionRange(
    result.start,
    result.end
  );
}

function replaceFunctionBlock(){
  const name=
    prompt("置換する関数名");
  if(!name)return;
  const result=
    findFunctionBlock(name);
  if(!result)return;
  const newCode=
    prompt(
      "新コード",
      result.block
    );
  if(newCode===null)return;
  const editor=
    get("repairEditor");
  editor.value=
    editor.value.slice(0,result.start)+
    newCode+
    editor.value.slice(result.end);
  alert("置換完了");
}

function extractFunctionBlocksFromText(text) {
  const source =
    String(text || "");

  const blocks = [];

  const patterns = [
    {
      type: "function",
      regex:
        /(?:^|\n)\s*(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/g
    },
    {
      type: "arrow-function",
      regex:
        /(?:^|\n)\s*(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/g
    },
    {
      type: "arrow-function",
      regex:
        /(?:^|\n)\s*(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?[a-zA-Z0-9_$]+\s*=>\s*\{/g
    },
    {
      type: "function-expression",
      regex:
        /(?:^|\n)\s*(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s+)?function\s*\(/g
    },
    {
      type: "window-function",
      regex:
        /(?:^|\n)\s*window\.([a-zA-Z0-9_$]+)\s*=\s*(?:async\s+)?function\s*\(/g
    }
  ];

  patterns.forEach(pattern => {
    let match;

    pattern.regex.lastIndex = 0;

    while ((match = pattern.regex.exec(source)) !== null) {
      const name =
        match[1];

      const start =
        match[0].startsWith("\n")
          ? match.index + 1
          : match.index;

      const braceStart =
        source.indexOf(
          "{",
          start
        );

      if (braceStart === -1) {
        continue;
      }

      const block =
        findBraceBlockFromPosition(
          source,
          start,
          braceStart
        );

      if (!block) {
        continue;
      }

      blocks.push({
        type: pattern.type,
        name,
        start,
        end: block.end,
        block:
          source.slice(
            start,
            block.end
          )
      });
    }
  });

  return blocks
    .filter((item, index, self) =>
      index === self.findIndex(x =>
        x.start === item.start &&
        x.name === item.name
      )
    )
    .sort((a, b) => a.start - b.start);
}
function findBraceBlockFromPosition(source, start, braceStart) {
  let depth = 0;
  let i = braceStart;

  let inString = false;
  let quote = "";
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      i++;
      continue;
    }

    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        inString = false;
        quote = "";
      }
      i++;
      continue;
    }

    if (ch === "/" && next === "/") {
      inLineComment = true;
      i += 2;
      continue;
    }

    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i += 2;
      continue;
    }

    if (
      ch === "\"" ||
      ch === "'" ||
      ch === "`"
    ) {
      inString = true;
      quote = ch;
      i++;
      continue;
    }

    if (ch === "{") {
      depth++;
    }

    if (ch === "}") {
      depth--;

      if (depth === 0) {
        i++;

        if (source[i] === ";") {
          i++;
        }

        return {
          start,
          end: i
        };
      }
    }

    i++;
  }

  return null;
}

function extractCodeBlocksFromText(text) {

  const source =
    String(text || "");

  const blocks = [];

  const functionBlocks =
    extractFunctionBlocksFromText(source);

  // section comment: 複数行見出し
  const sectionRegex =
    /\/\*\s*=+\s*\n([\s\S]*?)\n\s*=+\s*\*\//g;

  [...source.matchAll(sectionRegex)]
    .forEach(match => {

      blocks.push({
        type: "section",
        name:
          match[1]
            .split("\n")
            .map(x => x.trim())
            .filter(Boolean)[0] ||
          "Section",
        start: match.index,
        end:
          match.index +
          match[0].length,
        block: match[0]
      });

    });

  // top-level let const var only
  const variableRegex =
    /^(let|const|var)\s+([a-zA-Z0-9_$]+)/gm;

  [...source.matchAll(variableRegex)]
    .forEach(match => {

      const start =
        match.index;

      const insideFunction =
        functionBlocks.some(fn =>
          start > fn.start &&
          start < fn.end
        );

      if (insideFunction) {
        return;
      }

      const name =
        match[2];

      let end =
        source.indexOf(
          ";",
          start
        );

      if (end === -1) {
        end =
          source.indexOf(
            "\n",
            start
          );
      }

      if (end === -1) {
        end =
          source.length;
      }

      blocks.push({
        type: "variable",
        name,
        start,
        end: end + 1,
        block:
          source.slice(
            start,
            end + 1
          )
      });

    });

  functionBlocks.forEach(item => {

    blocks.push({
      type: "function",
      ...item
    });

  });

  return blocks.sort(
    (a,b)=>
    a.start-b.start
  );
}

/* ===============================
   Code Block List / Move
=============================== */

function showFunctionList() {

  const editor =
    get("repairEditor");

  const text =
    editor.value;

  if (!text.trim()) {
    alert("HTMLが空です");
    return;
  }

  console.log(
    "editor total:",
    text.split(/\r?\n/).length
  );

  console.log(
    "has CR:",
    text.includes("\r")
  );

  const blocks =
    extractCodeBlocksFromText(
      text
    );

  let html = "";

  if (blocks.length === 0) {

    html = "コードブロックなし";

  } else {

    html =
      blocks.map((item, i) => {

        const line =
          text
            .slice(
              0,
              item.start
            )
            .split(/\r?\n/)
            .length;

        console.log(
          `[${item.type}] ${item.name} / L${line}`
        );

        const moveButton =
          item.type === "function"
            ? `
<div class="float-panel-actions">
  <button
    onclick="
      moveFunctionPrompt(
        '${item.name}'
      )
    ">
    📦 Move
  </button>
</div>
`
            : "";

return `

<div class="function-list-row">

  <button
    class="
      float-list-btn
      function-list-select
    "
    onclick="
      selectCodeBlockByIndex(${i});
      closeFloatPanelKeepEditorSelection();
    ">

    [${item.type}]
    ${i + 1}.
    ${escapeHtml(item.name)}
    / L${line}

  </button>

  ${moveButton}

</div>
`;

      }).join("");
  }

  openFloatPanel(
    `コードブロック一覧 (${blocks.length})`,
    `
    <div class="float-panel-actions">
      <button onclick="copyCodeBlockList()">
        📋 一覧コピー
      </button>
    </div>
    ` + html
  );
}

function buildCodeBlockListText() {

  const editor =
    get("repairEditor");

  if (!editor) return "";

  const text =
    editor.value;

  const blocks =
    extractCodeBlocksFromText(text);

  return blocks.map((item, i) => {

    const line =
      text
        .slice(0, item.start)
        .split("\n")
        .length;

    return `[${item.type}] ${i + 1}. ${item.name} / L${line}`;

  }).join("\n");
}

function copyCodeBlockList() {

  const text =
    buildCodeBlockListText();

  if (!text) {
    alert("コピーする一覧がありません");
    return;
  }

  if (
    navigator.clipboard &&
    window.isSecureContext
  ) {
    navigator.clipboard
      .writeText(text)
      .then(() =>
        alert("コードブロック一覧をコピーしました")
      )
      .catch(() => {
        const ok =
          copyTextFallback(text);

        alert(
          ok
            ? "コードブロック一覧をコピーしました"
            : "コピー失敗"
        );
      });

    return;
  }

  const ok =
    copyTextFallback(text);

  alert(
    ok
      ? "コードブロック一覧をコピーしました"
      : "コピー失敗"
  );
}

function selectCodeBlockByStart(start) {

  const editor =
    get("repairEditor");

  if (!editor) {
    return;
  }

  editor.focus();

  editor.setSelectionRange(
    start,
    start
  );

  const line =
    editor.value
      .slice(0, start)
      .split("\n")
      .length;

  editor.scrollTop =
    Math.max(
      0,
      (line - 3) * 18
    );

  if (typeof updateCursorPosition === "function") {
    updateCursorPosition();
  }
}