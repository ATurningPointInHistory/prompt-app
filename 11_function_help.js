/* ===============================
   11_function_help.js
   Search Function Help
=============================== */

function searchFunctionHelp(
  keyword
) {

  const query =
    String(keyword || "")
      .trim()
      .toLowerCase();

  const database =
    getProjectFunctionDatabase();

  if (
    !database ||
    typeof database !== "object"
  ) {
    return [];
  }

  const functions =
    Object.entries(database)
      .map(entry => {

        const key =
          entry[0];

        const info =
          entry[1] || {};

        return {
          ...info,

          name:
            getFunctionName(info) !== "unknown"
              ? getFunctionName(info)
              : key,

          file:
            getFunctionFileName(info)
        };

      });

  if (!query) {

    return functions.sort(
      (a, b) =>
        String(a.name || "")
          .localeCompare(
            String(b.name || "")
          )
    );

  }

  return functions
    .filter(info => {

      const called =
        getFunctionCalledList(
          info
        );

      const calledBy =
        getFunctionCalledByList(
          info
        );

      const values = [

        info.name,
        info.functionName,
        info.title,
        info.summary,
        info.description,
        info.file,
        info.fileName,
        info.path,
        info.category,
        info.section,
        ...(info.tags || []),
        ...(info.parameters || []),
        ...(called || []),
        ...(calledBy || [])

      ];

      return values
        .filter(value =>
          value !== undefined &&
          value !== null
        )
        .some(value =>
          String(value)
            .toLowerCase()
            .includes(query)
        );

    })
    .sort(
      (a, b) => {

        const aName =
          String(a.name || "")
            .toLowerCase();

        const bName =
          String(b.name || "")
            .toLowerCase();

        const aExact =
          aName === query;

        const bExact =
          bName === query;

        if (aExact !== bExact) {
          return aExact
            ? -1
            : 1;
        }

        const aStarts =
          aName.startsWith(query);

        const bStarts =
          bName.startsWith(query);

        if (aStarts !== bStarts) {
          return aStarts
            ? -1
            : 1;
        }

        return aName.localeCompare(
          bName
        );

      }
    );

}

/* ===============================
   Get Function Help
=============================== */

function getFunctionHelp(
  functionName
) {

  const name =
    String(functionName || "")
      .trim();

  if (!name) {
    return null;
  }

  const database =
    getProjectFunctionDatabase();

  if (
    !database ||
    typeof database !== "object"
  ) {
    return null;
  }

  const normalized =
    name.toLowerCase();

  const entry =
    Object.entries(database)
      .find(([key, info]) => {

        const actualName =
          getFunctionName(
            info
          );

        return (
          String(key)
            .toLowerCase() ===
            normalized ||

          String(actualName)
            .toLowerCase() ===
            normalized
        );

      });

  if (!entry) {
    return null;
  }

  const key =
    entry[0];

  const info =
    entry[1] || {};

  const resolvedName =
    getFunctionName(info) !==
    "unknown"
      ? getFunctionName(info)
      : key;

  return {
    ...info,

    name:
      resolvedName,

    file:
      getFunctionFileName(
        info
      ),

    called:
      filterSelfFunctionCalls(
        resolvedName,
        getFunctionCalledList(
          info
        )
      ),

    calledBy:
      filterSelfFunctionCalls(
        resolvedName,
        getFunctionCalledByList(
          info
        )
      )

  };

}

/* ===============================
   Build Function Help Card HTML
=============================== */

function buildFunctionHelpCardHtml(
  info
) {

  if (!info) {

    return `
<div class="small">
関数情報が見つかりません。
</div>
`;

  }

  const name =
    info.name ||
    "unknown";

  const file =
    info.file ||
    info.fileName ||
    "unknown";

  const parameters =
    Array.isArray(info.parameters)
      ? info.parameters
      : [];

  const called =
    Array.isArray(info.called)
      ? info.called
      : [];

  const calledBy =
    Array.isArray(info.calledBy)
      ? info.calledBy
      : [];

  const keywords =
    Array.isArray(info.keywords)
      ? info.keywords
      : [];

  return `
<div class="function-help-card">

<h3>
${escapeHtml(name)}()
</h3>

<div class="small">
定義ファイル
</div>

<div>
${escapeHtml(file)}
${info.line
  ? " : line " + escapeHtml(info.line)
  : ""}
</div>

<hr>

<div class="small">
概要
</div>

<div>
${escapeHtml(
  info.aiComment ||
  info.summary ||
  "説明なし"
)}
</div>

<hr>

<div class="small">
引数
</div>

<pre class="code-preview">${
  parameters.length
    ? escapeHtml(
        parameters.join("\n")
      )
    : "なし"
}</pre>

<div class="small">
戻り値
</div>

<div>
${escapeHtml(
  info.returnValue ||
  "unknown"
)}
</div>

<hr>

<div class="small">
呼び出し先
</div>

<pre class="code-preview">${
  called.length
    ? escapeHtml(
        called.join("\n")
      )
    : "なし"
}</pre>

<div class="small">
呼び出し元
</div>

<pre class="code-preview">${
  calledBy.length
    ? escapeHtml(
        calledBy.join("\n")
      )
    : "なし"
}</pre>

<hr>

<div class="small">
分類
</div>

<div>
Section:
${escapeHtml(
  info.section ||
  "General"
)}
</div>

<div>
Role:
${escapeHtml(
  info.role ||
  "unknown"
)}
</div>

<div>
Risk:
${escapeHtml(
  info.risk ||
  "unknown"
)}
</div>

<div>
Keywords:
${escapeHtml(
  keywords.join(", ") ||
  "なし"
)}
</div>

<hr>

<div class="small">
Source Code
</div>

<pre class="code-preview">${escapeHtml(
  info.code ||
  "コードなし"
)}</pre>

</div>
`;

}

/* ===============================
   Show Function Help
=============================== */

function showFunctionHelp(
  functionName
) {

  const name =
    String(functionName || "")
      .trim();

  if (!name) {

    const input =
      prompt(
        "関数名を入力してください",
        ""
      );

    if (!input) {
      return false;
    }

    return showFunctionHelp(
      input
    );

  }

  const info =
    getFunctionHelp(
      name
    );

  if (!info) {

    alert(
      "関数が見つかりません\n\n" +
      name
    );

    return false;

  }

  openFloatPanel(
    "Function Help",
    buildFunctionHelpCardHtml(
      info
    )
  );

  return true;

}

/* ===============================
   Show Function Help Search
=============================== */

function showFunctionHelpSearch() {

  openFloatPanel(

    "Function Help",

    `
<div class="small">

検索

</div>

<input
  id="functionHelpKeyword"
  type="text"
  placeholder="関数名・ファイル名・キーワード"
  style="width:100%;"
>

<div
  class="float-panel-actions"
  style="margin-top:8px;">

<button
onclick="searchFunctionHelpPanel()">

🔍 Search

</button>

</div>

<div
id="functionHelpResult"
style="margin-top:10px;">

検索してください

</div>
`

  );

}

/* ===============================
   Search Function Help Panel
=============================== */

function searchFunctionHelpPanel() {

  const keyword =
    get(
      "functionHelpKeyword"
    )?.value || "";

  const list =
    searchFunctionHelp(
      keyword
    );

  const result =
    get(
      "functionHelpResult"
    );

  if (!result) {
    return;
  }

  result.innerHTML =
    buildFunctionHelpListHtml(
      list
    );

}

/* ===============================
   Build Function Help List HTML
=============================== */

function buildFunctionHelpListHtml(
  list
) {

  if (
    !Array.isArray(list) ||
    !list.length
  ) {

    return `
<div class="small">

検索結果はありません

</div>
`;

  }

  return list

    .map(info => {

      const name =
        info.name ||
        "unknown";

      const file =
        info.file ||
        info.fileName ||
        "";

      const summary =
        info.summary ||
        "";

      return `

<div
class="function-help-item"
onclick="
showFunctionHelp(
'${escapeHtml(name)}'
);
">

<b>
${escapeHtml(name)}()
</b>

<div class="small">
${escapeHtml(file)}
</div>

<div class="small">
${escapeHtml(summary)}
</div>

</div>

<hr>

`;

    })

    .join("");

}