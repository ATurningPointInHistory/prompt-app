/* ===============================
   FILE: 09_ai_error_prompt.js
   AI Error Investigation Prompt
=============================== */

let latestErrorPrompt = "";

function buildErrorInvestigationPrompt(
  errorInfo = {}
) {

  const message =
    errorInfo.message || "";

  const source =
    errorInfo.source || "";

  const line =
    errorInfo.line || "";

  const column =
    errorInfo.column || "";

  const stack =
    errorInfo.stack || "";

  const errorText =
    [
      message,
      source,
      line,
      column,
      stack
    ].join("\n");

  const type =
    detectErrorType(
      errorText
    );

  const relatedFunction =
    extractErrorFunction(
      errorText
    );

  const fileCandidate =
    relatedFunction &&
    typeof guessAiTargetFile === "function"
      ? guessAiTargetFile(
          relatedFunction
        )
      : "unknown";

  const causeCandidates =
    buildErrorCauseCandidates(
      type
    );

  const repairHint =
    buildRepairHint(
      relatedFunction,
      fileCandidate
    );

  const targetFunction =
    relatedFunction ||
    "不明";

  const sourceFile =
    source ||
    extractErrorField(
      stack,
      ".js"
    ) ||
    fileCandidate ||
    "不明";

  return `
AI Error Report v1

=== Error Type ===

${type}

=== Related Function ===

${relatedFunction || "none"}

=== File Candidate ===

${fileCandidate}

=== Cause Candidates ===

${
  causeCandidates
    .map(item => "・" + item)
    .join("\n")
}

=== Repair Hint ===

${repairHint}

=== AI Investigation Prompt ===

役割：
あなたは熟練したプロのJavaScriptエラー解析者兼ソフトウェアアーキテクトです。

対象システム：
AIプロンプト生成Pro

目的：
以下のJavaScriptエラーを解析し、原因特定、修正方針、差し替えコード、テスト手順を提示してください。

【エラー情報】

Error Type：
${type}

Message：
${message || "不明"}

Source：
${sourceFile}

Line：
${line || "不明"}

Column：
${column || "不明"}

Stack：
${stack || "不明"}

【調査してほしい内容】

① 原因候補一覧
- 可能性がある原因を優先度順に整理してください。

② 最も可能性が高い原因
- なぜその原因と判断できるかを説明してください。

③ 調査対象ファイル
- 修正すべき可能性が高いファイルを示してください。
- 現時点の推定対象：${fileCandidate}

④ 調査対象関数
- 重点的に確認すべき関数を示してください。
- 現時点の推定対象：${targetFunction}

⑤ 修正対象関数
- 差し替え対象の関数名を明確にしてください。

⑥ 修正内容
- 既存機能を壊さない最小修正にしてください。
- 推測だけで大規模変更しないでください。

⑦ 差し替えコード
- 必ず関数単位で出力してください。
- 既存コード全体の再出力は禁止です。

⑧ テスト手順
- 修正後に確認すべき操作手順を示してください。
- Sandbox / AutoTest に渡せる確認項目にしてください。

⑨ 再発防止策
- 読み込み順、未定義関数、DOM未取得、依存関係、Syntax Error の観点で再発防止策を示してください。

【制約】

・既存機能を削除しない
・既存UIを壊さない
・差し替えは関数単位
・原因調査 → 原因特定 → 修正案 → 実装 の順で進める
・09_ai_instruction.jsには追加しない
・必要なら 09_ai_error_prompt.js 側で独立実装する
・共通化すべき処理は 01_core.js または 01_project_config.js への移動候補として提案する
`.trim();

}

function generateErrorPrompt() {

  const raw =
    String(
      getErrorPromptInputText() || ""
    );

  if (!raw.trim()) {
    alert("エラー情報が空です");
    return "";
  }

  const errorInfo = {
    message:
      extractErrorField(raw, "message:") ||
      extractErrorField(raw, "Message:") ||
      raw.split(/\r?\n/)[0] ||
      "",

    source:
      extractErrorField(raw, "source:") ||
      extractErrorField(raw, "Source:") ||
      "",

    line:
      extractErrorField(raw, "line:") ||
      extractErrorField(raw, "Line:") ||
      "",

    column:
      extractErrorField(raw, "column:") ||
      extractErrorField(raw, "Column:") ||
      "",

    stack:
      extractAfterLabel(raw, "stack:") ||
      extractAfterLabel(raw, "Stack:") ||
      raw
  };

  latestErrorPrompt =
    buildErrorInvestigationPrompt(
      errorInfo
    );

  if (typeof openFloatPanel === "function") {

    openFloatPanel(
      "📋 AIエラー調査プロンプト",
      `
<textarea
id="aiErrorPromptOutput"
rows="16"
style="
width:100%;
height:60vh;
font-family:monospace;
font-size:11px;
white-space:pre;
overflow:auto;
resize:vertical;
"
placeholder="Generated AI Error Prompt"
></textarea>

<div class="float-panel-actions">

<button
onclick="copyErrorPrompt()">
📋 コピー
</button>

</div>
`
    );

  }

  const output =
    typeof get === "function"
      ? get("aiErrorPromptOutput")
      : document.getElementById("aiErrorPromptOutput");

  if (output) {
    output.value =
      latestErrorPrompt;
  }

  if (typeof updateRepairStatus === "function") {
    updateRepairStatus(
      "AI Error Prompt生成完了"
    );
  }

  return latestErrorPrompt;

}

function copyErrorPrompt() {

  const text =
    latestErrorPrompt ||
    generateErrorPrompt();

  if (!text) {
    alert("コピーするプロンプトがありません");
    return;
  }

  if (
    navigator.clipboard &&
    window.isSecureContext
  ) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert("AI Error Promptをコピーしました");
      })
      .catch(() => {
        const ok =
          copyTextFallback(text);

        alert(
          ok
            ? "AI Error Promptをコピーしました"
            : "コピー失敗"
        );
      });

    return;
  }

  const ok =
    copyTextFallback(text);

  alert(
    ok
      ? "AI Error Promptをコピーしました"
      : "コピー失敗"
  );
}

function generateErrorPromptFromPopup() {

  const input =
    get("aiErrorPromptInput");

  if (!input || !input.value.trim()) {
    alert("エラー情報が空です");
    return;
  }

  generateErrorPrompt();

}

function getErrorPromptInputText() {

  const ids = [
    "aiErrorPromptInput",
    "aiErrorInput",
    "errorInput",
    "jsErrorInput",
    "repairEditor"
  ];

  for (const id of ids) {

    const el =
      typeof get === "function"
        ? get(id)
        : document.getElementById(id);

    if (el && el.value) {
      return el.value;
    }
  }

  return prompt(
    "JS Error情報を貼り付けてください"
  ) || "";

}

function extractAfterLabel(
  text,
  label
) {

  if (!text || !label) {
    return "";
  }

  const pattern =
    new RegExp(
      "^\\s*" +
      label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
      "\\s*[:：]\\s*(.*)$",
      "im"
    );

  const match =
    String(text).match(pattern);

  return match
    ? match[1].trim()
    : "";

}

/* ===============================
   Error Analysis Helpers
=============================== */

function detectErrorType(text) {

  const source =
    String(text || "");

  const rules = [

    {
      type: "ReferenceError",
      regex: /ReferenceError/i
    },

    {
      type: "TypeError",
      regex: /TypeError/i
    },

    {
      type: "SyntaxError",
      regex: /SyntaxError/i
    },

    {
      type: "RangeError",
      regex: /RangeError/i
    },

    {
      type: "URIError",
      regex: /URIError/i
    },

    {
      type: "EvalError",
      regex: /EvalError/i
    },

    {
      type: "AggregateError",
      regex: /AggregateError/i
    },

    {
      type: "DOMException",
      regex: /DOMException/i
    },

    {
      type: "Promise Error",
      regex:
        /Unhandled Promise|PromiseRejection|Promise Error/i
    },

    {
      type: "Event Error",
      regex:
        /Event Error|dispatchEvent|addEventListener/i
    },

    {
      type: "Network Error",
      regex:
        /NetworkError|Failed to fetch|ERR_/i
    }

  ];

  for (const rule of rules) {

    if (
      rule.regex.test(source)
    ) {
      return rule.type;
    }

  }

  return "Unknown";

}

function extractErrorFunction(text) {

  const source =
    String(text || "");

  const patterns = [

    /([a-zA-Z_$][\w$]*) is not defined/,

    /at ([a-zA-Z_$][\w$]*)\s*\(/,

    /function ([a-zA-Z_$][\w$]*)/

  ];

  for (const pattern of patterns) {

    const match =
      source.match(pattern);

    if (
      match &&
      match[1]
    ) {
      return match[1];
    }

  }

  return "";

}

function buildErrorCauseCandidates(
  errorType
) {

  switch (errorType) {

    case "ReferenceError":

      return [

        "関数が未定義",

        "script読込順",

        "構文エラーで読込停止",

        "window登録漏れ"

      ];

    case "TypeError":

      return [

        "null参照",

        "undefined参照",

        "DOM取得失敗",

        "戻り値不正"

      ];

    case "SyntaxError":

      return [

        "括弧不足",

        "閉じ忘れ",

        "カンマ不足",

        "テンプレート文字列"

      ];

    default:

      return [

        "原因を手動調査"

      ];

  }

}

function openErrorPromptInputPopup() {

  generateErrorPrompt();

}

window.openErrorPromptInputPopup =
  openErrorPromptInputPopup;

function buildRepairHint(
  functionName,
  fileName
) {

  const lines = [];

  lines.push(
    "① 関数が存在するか確認"
  );

  if (functionName) {

    lines.push(
      "② " +
      functionName +
      " の定義確認"
    );

  }

  if (
    fileName &&
    fileName !== "unknown"
  ) {

    lines.push(
      "③ " +
      fileName +
      " の読込確認"
    );

  }

  lines.push(
    "④ script読込順確認"
  );

  lines.push(
    "⑤ Health診断実施"
  );

  return lines.join("\n");

}

if (typeof generateErrorPrompt === "function") {
  window.generateErrorPrompt =
    generateErrorPrompt;
}

if (typeof copyErrorPrompt === "function") {
  window.copyErrorPrompt =
    copyErrorPrompt;
}

if (typeof buildErrorInvestigationPrompt === "function") {
  window.buildErrorInvestigationPrompt =
    buildErrorInvestigationPrompt;
}

console.log(
  "09_ai_error_prompt loaded"
);