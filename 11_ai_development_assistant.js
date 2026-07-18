/* ===============================
   FILE: 11_ai_development_assistant.js
   AI Development Assistant
   IDE-100
=============================== */

let aiDevelopmentAssistantState = {
  issue: "",
  focus: "overview",
  lastAnalysis: null,
  updatedAt: ""
};

function initAiDevelopmentAssistant() {
  registerAiDevelopmentAssistantCommand();
  return true;
}

function getAiDevelopmentAssistantSafeResult(functionName, fallback) {
  try {
    const target = window[functionName];
    return typeof target === "function"
      ? target(false)
      : fallback;
  } catch (error) {
    return {
      error: error && error.message
        ? error.message
        : String(error)
    };
  }
}

function getAiDevelopmentAssistantProjectSummary() {
  let database = {};

  try {
    database =
      typeof getProjectFunctionDatabase === "function"
        ? getProjectFunctionDatabase() || {}
        : {};
  } catch (error) {
    database = {};
  }

  const records = Array.isArray(database)
    ? database
    : Object.values(database || {});

  const files = new Set();
  records.forEach(record => {
    const file = record && (
      record.fileName ||
      record.file ||
      record.path
    );
    if (file) files.add(String(file));
  });

  return {
    functions: records.length,
    files: files.size,
    databaseAvailable: records.length > 0
  };
}

function collectAiDevelopmentContext() {
  const validation =
    getAiDevelopmentAssistantSafeResult(
      "validateDevelopmentIDE",
      null
    );

  const dashboard =
    getAiDevelopmentAssistantSafeResult(
      "getDevelopmentDashboardStatus",
      null
    );

  const release =
    getAiDevelopmentAssistantSafeResult(
      "getDevelopmentIDERelease",
      null
    );

  const errorInspector =
    getAiDevelopmentAssistantSafeResult(
      "getErrorInspectorStatus",
      null
    );

  const project =
    getAiDevelopmentAssistantProjectSummary();

  return {
    id: "IDE-100-CONTEXT",
    project,
    validation,
    dashboard,
    release,
    errorInspector,
    collectedAt: new Date().toISOString(),
    readOnly: true
  };
}

function buildAiDevelopmentRecommendations(context) {
  const recommendations = [];
  const validation = context && context.validation;
  const dashboard = context && context.dashboard;
  const project = context && context.project;

  if (
    validation &&
    validation.releaseReady === false
  ) {
    recommendations.push({
      priority: "High",
      title: "IDE validation failuresを解消",
      reason:
        (validation.failed || []).length +
        "件の検証失敗があります。",
      action:
        "validateDevelopmentIDE(false) の failed と errors を確認してください。"
    });
  }

  if (
    dashboard &&
    Number(dashboard.health) < 100
  ) {
    recommendations.push({
      priority: "High",
      title: "Development Healthを回復",
      reason:
        "現在のHealthは " +
        Number(dashboard.health || 0) +
        "%です。",
      action:
        "Development Dashboardのalertsと未Ready moduleを優先してください。"
    });
  }

  if (
    project &&
    project.databaseAvailable === false
  ) {
    recommendations.push({
      priority: "Medium",
      title: "Project Databaseを構築",
      reason:
        "Function Databaseを参照できません。",
      action:
        "buildProjectDatabase() 実行後に再解析してください。"
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: "Normal",
      title: "次の開発課題を選定",
      reason:
        "IDE基盤・検証・Healthに重大な問題は検出されませんでした。",
      action:
        "未実装Knowledge Object、Dashboard alerts、Roadmapの順で次タスクを決定してください。"
    });
  }

  return recommendations;
}

function analyzeAiDevelopmentProject(options = {}) {
  const context = collectAiDevelopmentContext();
  const issue = String(options.issue || "").trim();
  const focus = String(options.focus || "overview");
  const recommendations =
    buildAiDevelopmentRecommendations(context);

  const result = {
    id: "IDE-100-ANALYSIS",
    title: "AI Development Analysis",
    valid: true,
    focus,
    issue,
    context,
    recommendations,
    recommendationCount: recommendations.length,
    analyzedAt: new Date().toISOString(),
    readOnly: true
  };

  aiDevelopmentAssistantState = {
    issue,
    focus,
    lastAnalysis: result,
    updatedAt: result.analyzedAt
  };

  return result;
}

function buildAiDevelopmentPrompt(options = {}) {
  const analysis =
    options.analysis ||
    analyzeAiDevelopmentProject(options);

  const issue = String(
    options.issue ||
    analysis.issue ||
    "次の開発タスクを判断する"
  ).trim();

  const project = analysis.context.project || {};
  const validation = analysis.context.validation || {};
  const recommendations = analysis.recommendations || [];

  return [
    "あなたはAIプロンプト生成ProのSoftware Architectです。",
    "既存設計とSingle Source of Truthを尊重し、憶測で変更しないでください。",
    "",
    "## 開発課題",
    issue,
    "",
    "## 現在の状態",
    "- Functions: " + Number(project.functions || 0),
    "- Files: " + Number(project.files || 0),
    "- IDE Health: " + Number(validation.health || 0) + "%",
    "- Development Progress: " + Number(validation.developmentProgress || 0) + "%",
    "- Release Ready: " + (validation.releaseReady === true ? "true" : "false"),
    "",
    "## 推奨確認事項",
    ...recommendations.map((item, index) =>
      (index + 1) + ". " + item.title + " — " + item.action
    ),
    "",
    "## 回答ルール",
    "- 追加ファイルと修正ファイルを分ける",
    "- 修正はfunction単位で示す",
    "- 既存責務との重複を確認する",
    "- 実装後の検証関数と期待結果を示す",
    "- Architecture影響がある場合のみ明示する"
  ].join("\n");
}

function renderAiDevelopmentAssistant(analysis) {
  const result =
    analysis ||
    aiDevelopmentAssistantState.lastAnalysis ||
    analyzeAiDevelopmentProject();

  const context = result.context || {};
  const project = context.project || {};
  const validation = context.validation || {};
  const recommendations = result.recommendations || [];
  const escape =
    typeof escapeHtml === "function"
      ? escapeHtml
      : value => String(value || "");

  return `
<div class="small">
Repository・Analyzer・IDEの状態から、次の開発判断とAI用プロンプトを生成します。
</div>

<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px;">
  <div class="card"><b>Health</b><br>${escape(validation.health || 0)}%</div>
  <div class="card"><b>Progress</b><br>${escape(validation.developmentProgress || 0)}%</div>
  <div class="card"><b>Functions</b><br>${escape(project.functions || 0)}</div>
  <div class="card"><b>Files</b><br>${escape(project.files || 0)}</div>
</div>

<label class="small" style="display:block;margin-top:12px;">開発課題</label>
<textarea id="aiDevelopmentIssue" rows="4" style="width:100%;">${escape(result.issue || "")}</textarea>

<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
  <button onclick="refreshAiDevelopmentAssistant()">Analyze</button>
  <button onclick="copyAiDevelopmentPrompt()">Copy AI Prompt</button>
  <button onclick="validateAiDevelopmentAssistant()">Validate</button>
</div>

<h3 style="margin-top:14px;">Recommendations</h3>
${recommendations.map(item => `
<div class="card" style="margin-top:8px;">
  <b>[${escape(item.priority)}] ${escape(item.title)}</b>
  <div class="small" style="margin-top:4px;">${escape(item.reason)}</div>
  <div style="margin-top:6px;">${escape(item.action)}</div>
</div>
`).join("")}

<div class="small" style="margin-top:12px;">
Updated: ${escape(result.analyzedAt || "")}
</div>
`;
}

function showAiDevelopmentAssistant(options = {}) {
  const analysis = analyzeAiDevelopmentProject(options);
  const html = renderAiDevelopmentAssistant(analysis);

  if (typeof openFloatPanel !== "function") {
    return {
      shown: false,
      reason: "openFloatPanel unavailable",
      analysis,
      html
    };
  }

  openFloatPanel(
    "IDE-100 AI Development Assistant",
    html
  );

  return {
    shown: true,
    method: "openFloatPanel",
    analysis,
    htmlLength: html.length
  };
}

function refreshAiDevelopmentAssistant() {
  const input =
    typeof get === "function"
      ? get("aiDevelopmentIssue")
      : document.getElementById("aiDevelopmentIssue");

  return showAiDevelopmentAssistant({
    issue: input ? input.value : ""
  });
}

function copyAiDevelopmentPrompt() {
  const input =
    typeof get === "function"
      ? get("aiDevelopmentIssue")
      : document.getElementById("aiDevelopmentIssue");

  const prompt = buildAiDevelopmentPrompt({
    issue: input ? input.value : ""
  });

  if (typeof copyText === "function") {
    copyText(prompt);
  } else if (
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    navigator.clipboard.writeText(prompt);
  }

  return prompt;
}

function getAiDevelopmentAssistantStatus() {
  const validation = validateAiDevelopmentAssistant(false);

  return {
    id: "IDE-100",
    title: "AI Development Assistant",
    version: "1.0",
    status: validation.valid ? "Ready" : "Blocked",
    ready: validation.valid,
    progress: validation.valid ? 100 : validation.progress,
    health: validation.health,
    recommendations:
      aiDevelopmentAssistantState.lastAnalysis
        ? aiDevelopmentAssistantState.lastAnalysis.recommendationCount
        : 0,
    nextTask:
      validation.valid
        ? "Use AI Development Assistant"
        : "Resolve IDE-100 validation failures",
    readOnly: true
  };
}

function validateAiDevelopmentAssistant(writeLog = true) {
  const checks = {
    state:
      aiDevelopmentAssistantState &&
      typeof aiDevelopmentAssistantState === "object",
    collector:
      typeof collectAiDevelopmentContext === "function",
    analyzer:
      typeof analyzeAiDevelopmentProject === "function",
    recommendations:
      typeof buildAiDevelopmentRecommendations === "function",
    prompt:
      typeof buildAiDevelopmentPrompt === "function",
    renderer:
      typeof renderAiDevelopmentAssistant === "function",
    launcher:
      typeof showAiDevelopmentAssistant === "function",
    refresh:
      typeof refreshAiDevelopmentAssistant === "function",
    status:
      typeof getAiDevelopmentAssistantStatus === "function",
    output: false
  };

  const errors = [];

  try {
    const analysis = analyzeAiDevelopmentProject({
      issue: "IDE-100 validation"
    });
    const prompt = buildAiDevelopmentPrompt({ analysis });
    const html = renderAiDevelopmentAssistant(analysis);

    checks.output =
      analysis &&
      analysis.valid === true &&
      Array.isArray(analysis.recommendations) &&
      typeof prompt === "string" &&
      prompt.length > 100 &&
      typeof html === "string" &&
      html.length > 100;
  } catch (error) {
    errors.push(
      error && error.message
        ? error.message
        : String(error)
    );
  }

  const failed = Object.keys(checks)
    .filter(key => checks[key] !== true);
  const passed = Object.keys(checks).length - failed.length;
  const total = Object.keys(checks).length;
  const valid = failed.length === 0 && errors.length === 0;

  const result = {
    id: "IDE-100",
    title: "AI Development Assistant",
    valid,
    passed,
    total,
    failed,
    checks,
    errors,
    health: Math.round(passed / total * 100),
    progress: Math.round(passed / total * 100),
    readOnly: true
  };

  if (writeLog !== false) console.log(result);
  return result;
}

function registerAiDevelopmentAssistantCommand() {
  if (
    typeof registerCommandPaletteCommand !== "function"
  ) {
    return false;
  }

  return registerCommandPaletteCommand({
    id: "ide.ai-development-assistant.open",
    type: "ide",
    title: "Open AI Development Assistant",
    summary: "AI開発支援画面を開きます。",
    category: "IDE",
    keywords: [
      "ide",
      "ai",
      "development",
      "assistant",
      "analysis",
      "開発支援"
    ],
    icon: "🤖",
    action() {
      return showAiDevelopmentAssistant();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initAiDevelopmentAssistant,
    { once: true }
  );
} else {
  initAiDevelopmentAssistant();
}
