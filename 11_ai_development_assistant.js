/* ===============================
   FILE: 11_ai_development_assistant.js
   AI Development Assistant
   IDE-100
   Implementation v1.1
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

function getAiDevelopmentAssistantSafeResult(functionName, fallback, args = []) {
  try {
    const target = window[functionName];
    return typeof target === "function"
      ? target(...args)
      : fallback;
  } catch (error) {
    return {
      error: error && error.message
        ? error.message
        : String(error)
    };
  }
}

function normalizeAiDevelopmentArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
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

  const records = normalizeAiDevelopmentArray(database);
  const files = new Set();
  const modules = new Set();

  records.forEach(record => {
    const file = record && (
      record.fileName || record.file || record.path
    );
    const moduleName = record && (
      record.module || record.section || record.category
    );
    if (file) files.add(String(file));
    if (moduleName) modules.add(String(moduleName));
  });

  return {
    functions: records.length,
    files: files.size,
    modules: modules.size,
    databaseAvailable: records.length > 0
  };
}

function retrieveAiDevelopmentKnowledge(issue = "") {
  const query = String(issue || "").trim();
  const results = [];
  const seen = new Set();

  function addResult(item, source) {
    if (!item || typeof item !== "object") return;
    const id = String(item.id || item.ID || item.name || item.title || "").trim();
    const key = id || JSON.stringify(item).slice(0, 120);
    if (!key || seen.has(key)) return;
    seen.add(key);
    results.push({
      id,
      title: String(item.title || item.name || item.boxTitle || id || "Knowledge"),
      summary: String(item.summary || item.description || ""),
      status: String(item.status || ""),
      source,
      raw: item
    });
  }

  if (query) {
    [
      ["findKnowledgeById", [query]],
      ["findKnowledgeByKeyword", [query]],
      ["findKnowledgeByCategory", [query]],
      ["findKnowledgeBySeries", [query]]
    ].forEach(([name, args]) => {
      const value = getAiDevelopmentAssistantSafeResult(name, null, args);
      normalizeAiDevelopmentArray(value).forEach(item => addResult(item, name));
      if (value && !Array.isArray(value)) addResult(value, name);
    });
  }

  const official = results.filter(item =>
    !item.status || item.status.toLowerCase() === "official"
  );

  return {
    id: "IDE-100-KNOWLEDGE",
    query,
    available: results.length > 0,
    count: results.length,
    officialCount: official.length,
    results: results.slice(0, 20),
    readOnly: true
  };
}

function analyzeAiDevelopmentRepository(issue = "") {
  const project = getAiDevelopmentAssistantProjectSummary();
  const query = String(issue || "").trim();
  let searchResults = [];

  if (query) {
    const search = getAiDevelopmentAssistantSafeResult(
      "searchProject",
      [],
      [query]
    );
    searchResults = normalizeAiDevelopmentArray(search).slice(0, 20);
  }

  return {
    id: "IDE-100-REPOSITORY",
    project,
    query,
    matches: searchResults,
    matchCount: searchResults.length,
    available: project.databaseAvailable,
    readOnly: true
  };
}

function analyzeAiDevelopmentArchitecture(issue = "") {
  const query = String(issue || "").trim();
  const statistics = getAiDevelopmentAssistantSafeResult(
    "getArchitectureStatistics",
    null
  );
  const search = query
    ? getAiDevelopmentAssistantSafeResult(
        "searchArchitectureObjects",
        [],
        [query]
      )
    : [];
  const objects = normalizeAiDevelopmentArray(search).slice(0, 20);

  return {
    id: "IDE-100-ARCHITECTURE",
    query,
    statistics,
    objects,
    objectCount: objects.length,
    available: Boolean(statistics) || objects.length > 0,
    readOnly: true
  };
}

function reviewAiDevelopmentContext(context) {
  const findings = [];
  const validation = context && context.validation;
  const dashboard = context && context.dashboard;
  const architecture = context && context.architecture;
  const knowledge = context && context.knowledge;
  const errors = context && context.errorInspector;

  if (validation && validation.releaseReady === false) {
    findings.push({
      severity: "High",
      type: "Validation",
      message: "Development IDE is not release ready.",
      evidence: normalizeAiDevelopmentArray(validation.failed)
    });
  }

  if (dashboard && Number(dashboard.health) < 100) {
    findings.push({
      severity: "High",
      type: "Health",
      message: "Development Dashboard health is below 100%.",
      evidence: [Number(dashboard.health || 0)]
    });
  }

  if (errors && Number(errors.runtime || errors.records || 0) > 0) {
    findings.push({
      severity: "Medium",
      type: "Runtime",
      message: "Error Inspector contains runtime records.",
      evidence: [Number(errors.runtime || errors.records || 0)]
    });
  }

  if (knowledge && context.issue && knowledge.count === 0) {
    findings.push({
      severity: "Medium",
      type: "Knowledge",
      message: "No directly related Knowledge Object was found for the request.",
      evidence: [context.issue]
    });
  }

  if (architecture && context.issue && architecture.objectCount === 0) {
    findings.push({
      severity: "Normal",
      type: "Architecture",
      message: "No directly matching Architecture Object was found.",
      evidence: [context.issue]
    });
  }

  return {
    id: "IDE-100-REVIEW",
    valid: findings.every(item => item.severity !== "High"),
    findings,
    findingCount: findings.length,
    readOnly: true
  };
}

function collectAiDevelopmentContext(options = {}) {
  const issue = String(options.issue || "").trim();
  const focus = String(options.focus || "overview");
  const validation = getAiDevelopmentAssistantSafeResult(
    "validateDevelopmentIDE",
    null,
    [false]
  );
  const dashboard = getAiDevelopmentAssistantSafeResult(
    "getDevelopmentDashboardStatus",
    null
  );
  const release = getAiDevelopmentAssistantSafeResult(
    "getDevelopmentIDERelease",
    null
  );
  const errorInspector = getAiDevelopmentAssistantSafeResult(
    "getErrorInspectorStatus",
    null
  );
  const repository = analyzeAiDevelopmentRepository(issue);
  const knowledge = retrieveAiDevelopmentKnowledge(issue);
  const architecture = analyzeAiDevelopmentArchitecture(issue);

  const context = {
    id: "IDE-100-CONTEXT",
    issue,
    focus,
    project: repository.project,
    repository,
    knowledge,
    architecture,
    validation,
    dashboard,
    release,
    errorInspector,
    collectedAt: new Date().toISOString(),
    readOnly: true
  };

  context.review = reviewAiDevelopmentContext(context);
  return context;
}

function buildAiDevelopmentRecommendations(context) {
  const recommendations = [];
  const validation = context && context.validation;
  const dashboard = context && context.dashboard;
  const project = context && context.project;
  const knowledge = context && context.knowledge;
  const architecture = context && context.architecture;
  const review = context && context.review;

  function add(priority, title, reason, action, sources = []) {
    recommendations.push({
      priority,
      title,
      reason,
      action,
      sources: normalizeAiDevelopmentArray(sources).filter(Boolean)
    });
  }

  if (validation && validation.releaseReady === false) {
    add(
      "High",
      "IDE validation failuresを解消",
      normalizeAiDevelopmentArray(validation.failed).length + "件の検証失敗があります。",
      "validateDevelopmentIDE(false) の failed と errors を確認してください。",
      ["IDE-095", "validateDevelopmentIDE"]
    );
  }

  if (dashboard && Number(dashboard.health) < 100) {
    add(
      "High",
      "Development Healthを回復",
      "現在のHealthは " + Number(dashboard.health || 0) + "%です。",
      "Development Dashboardのalertsと未Ready moduleを優先してください。",
      ["IDE-090", "getDevelopmentDashboardStatus"]
    );
  }

  if (project && project.databaseAvailable === false) {
    add(
      "Medium",
      "Project Databaseを構築",
      "Function Databaseを参照できません。",
      "buildProjectDatabase() 実行後に再解析してください。",
      ["REPOSITORY-001", "buildProjectDatabase"]
    );
  }

  if (context && context.issue && knowledge && knowledge.count === 0) {
    add(
      "Medium",
      "Knowledgeを確認",
      "開発課題に直接一致するKnowledge Objectが見つかりませんでした。",
      "既存KnowledgeのID・Keywords・Relationshipsを確認し、重複作成を避けてください。",
      ["KNOWLEDGE-001"]
    );
  }

  if (context && context.issue && architecture && architecture.objectCount === 0) {
    add(
      "Normal",
      "Architecture影響を確認",
      "開発課題に直接一致するArchitecture Objectが見つかりませんでした。",
      "実装前に既存Layer・DependsOn・Providesとの整合性を確認してください。",
      ["ARCHITECTURE", "REPOSITORY-001"]
    );
  }

  normalizeAiDevelopmentArray(review && review.findings)
    .filter(item => item.severity === "High")
    .forEach(item => {
      if (!recommendations.some(rec => rec.title.includes(item.type))) {
        add(
          "High",
          item.type + " reviewを解消",
          item.message,
          "関連する検証結果とEvidenceを確認してください。",
          [item.type]
        );
      }
    });

  if (recommendations.length === 0) {
    add(
      "Normal",
      "次の開発課題を選定",
      "IDE基盤・検証・Healthに重大な問題は検出されませんでした。",
      "Official Knowledge、Dashboard alerts、Roadmapの順で次タスクを決定してください。",
      ["IDE-090", "IDE-095", "Knowledge Repository"]
    );
  }

  return recommendations;
}

function explainAiDevelopmentRecommendation(recommendation) {
  const item = recommendation || {};
  const sources = normalizeAiDevelopmentArray(item.sources);
  return {
    title: String(item.title || "Recommendation"),
    summary: String(item.reason || ""),
    action: String(item.action || ""),
    traceability: sources.length
      ? sources.join(" → ")
      : "No explicit source",
    advisory: true,
    developerDecisionRequired: true
  };
}

function buildAiDevelopmentPlan(context, recommendations) {
  const items = normalizeAiDevelopmentArray(recommendations);
  return {
    id: "IDE-100-PLAN",
    issue: String(context && context.issue || ""),
    steps: items.map((item, index) => ({
      order: index + 1,
      priority: item.priority,
      task: item.title,
      action: item.action,
      approvalRequired: true
    })),
    readOnly: true,
    developerDecisionRequired: true
  };
}

function analyzeAiDevelopmentProject(options = {}) {
  const issue = String(options.issue || "").trim();
  const focus = String(options.focus || "overview");
  const context = collectAiDevelopmentContext({ issue, focus });
  const recommendations = buildAiDevelopmentRecommendations(context);
  const explanations = recommendations.map(explainAiDevelopmentRecommendation);
  const plan = buildAiDevelopmentPlan(context, recommendations);

  const result = {
    id: "IDE-100-ANALYSIS",
    title: "AI Development Analysis",
    valid: Boolean(context.review && context.review.valid !== false),
    focus,
    issue,
    context,
    recommendations,
    explanations,
    plan,
    recommendationCount: recommendations.length,
    analyzedAt: new Date().toISOString(),
    readOnly: true,
    developerDecisionRequired: true
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
  const analysis = options.analysis || analyzeAiDevelopmentProject(options);
  const issue = String(
    options.issue || analysis.issue || "次の開発タスクを判断する"
  ).trim();
  const context = analysis.context || {};
  const project = context.project || {};
  const validation = context.validation || {};
  const knowledge = context.knowledge || {};
  const architecture = context.architecture || {};
  const recommendations = analysis.recommendations || [];

  return [
    "あなたはAIプロンプト生成ProのSoftware Architectです。",
    "既存設計とSingle Source of Truthを尊重し、憶測で変更しないでください。",
    "提案は助言に限定し、ユーザーの明示承認なしにデータを変更しないでください。",
    "",
    "## 開発課題",
    issue,
    "",
    "## 現在の状態",
    "- Functions: " + Number(project.functions || 0),
    "- Files: " + Number(project.files || 0),
    "- Modules: " + Number(project.modules || 0),
    "- IDE Health: " + Number(validation.health || 0) + "%",
    "- Development Progress: " + Number(validation.developmentProgress || 0) + "%",
    "- Release Ready: " + (validation.releaseReady === true ? "true" : "false"),
    "- Related Knowledge: " + Number(knowledge.count || 0),
    "- Related Architecture Objects: " + Number(architecture.objectCount || 0),
    "",
    "## 推奨確認事項",
    ...recommendations.map((item, index) =>
      (index + 1) + ". " + item.title + " — " + item.action +
      (item.sources && item.sources.length ? " [" + item.sources.join(", ") + "]" : "")
    ),
    "",
    "## 回答ルール",
    "- 追加ファイルと修正ファイルを分ける",
    "- 修正はfunction単位で示す",
    "- 既存責務との重複を確認する",
    "- Knowledge・Repository・Architectureの根拠を示す",
    "- 実装後の検証関数と期待結果を示す",
    "- Architecture影響がある場合のみ明示する",
    "- 自動適用せずDeveloper Decisionを待つ"
  ].join("\n");
}

function renderAiDevelopmentAssistant(analysis) {
  const result = analysis || aiDevelopmentAssistantState.lastAnalysis || analyzeAiDevelopmentProject();
  const context = result.context || {};
  const project = context.project || {};
  const validation = context.validation || {};
  const knowledge = context.knowledge || {};
  const architecture = context.architecture || {};
  const recommendations = result.recommendations || [];
  const escape = typeof escapeHtml === "function" ? escapeHtml : value => String(value || "");

  return `
<div class="small">Repository・Knowledge・Architecture・IDE状態から、Read Onlyで開発判断とAI用プロンプトを生成します。</div>
<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px;">
  <div class="card"><b>Health</b><br>${escape(validation.health || 0)}%</div>
  <div class="card"><b>Progress</b><br>${escape(validation.developmentProgress || 0)}%</div>
  <div class="card"><b>Functions</b><br>${escape(project.functions || 0)}</div>
  <div class="card"><b>Files</b><br>${escape(project.files || 0)}</div>
  <div class="card"><b>Knowledge</b><br>${escape(knowledge.count || 0)}</div>
  <div class="card"><b>Architecture</b><br>${escape(architecture.objectCount || 0)}</div>
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
  <div class="small" style="margin-top:6px;">Source: ${escape(normalizeAiDevelopmentArray(item.sources).join(" → ") || "No explicit source")}</div>
</div>`).join("")}
<div class="small" style="margin-top:12px;">Advisory only / Developer decision required</div>
<div class="small" style="margin-top:4px;">Updated: ${escape(result.analyzedAt || "")}</div>
`;
}

function showAiDevelopmentAssistant(options = {}) {
  const analysis = analyzeAiDevelopmentProject(options);
  const html = renderAiDevelopmentAssistant(analysis);

  if (typeof openFloatPanel !== "function") {
    return { shown: false, reason: "openFloatPanel unavailable", analysis, html };
  }

  openFloatPanel("IDE-100 AI Development Assistant", html);
  return { shown: true, method: "openFloatPanel", analysis, htmlLength: html.length };
}

function refreshAiDevelopmentAssistant() {
  const input = typeof get === "function"
    ? get("aiDevelopmentIssue")
    : document.getElementById("aiDevelopmentIssue");
  return showAiDevelopmentAssistant({ issue: input ? input.value : "" });
}

function copyAiDevelopmentPrompt() {
  const input = typeof get === "function"
    ? get("aiDevelopmentIssue")
    : document.getElementById("aiDevelopmentIssue");
  const prompt = buildAiDevelopmentPrompt({ issue: input ? input.value : "" });

  if (typeof copyText === "function") {
    copyText(prompt);
  } else if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    navigator.clipboard.writeText(prompt);
  }

  return prompt;
}

function getAiDevelopmentAssistantStatus() {
  const validation = validateAiDevelopmentAssistant(false);
  return {
    id: "IDE-100",
    title: "AI Development Assistant",
    version: "1.1",
    specificationVersion: "1.0",
    status: validation.valid ? "Ready" : "Blocked",
    ready: validation.valid,
    progress: validation.valid ? 100 : validation.progress,
    health: validation.health,
    recommendations: aiDevelopmentAssistantState.lastAnalysis
      ? aiDevelopmentAssistantState.lastAnalysis.recommendationCount
      : 0,
    nextTask: validation.valid
      ? "Development IDE v1.0 Release"
      : "Resolve IDE-100 validation failures",
    readOnly: true,
    developerDecisionRequired: true
  };
}

function validateAiDevelopmentAssistant(writeLog = true) {
  const checks = {
    state: aiDevelopmentAssistantState && typeof aiDevelopmentAssistantState === "object",
    contextAnalyzer: typeof collectAiDevelopmentContext === "function",
    knowledgeRetriever: typeof retrieveAiDevelopmentKnowledge === "function",
    repositoryAnalyzer: typeof analyzeAiDevelopmentRepository === "function",
    architectureAnalyzer: typeof analyzeAiDevelopmentArchitecture === "function",
    recommendationEngine: typeof buildAiDevelopmentRecommendations === "function",
    reviewEngine: typeof reviewAiDevelopmentContext === "function",
    explanationGenerator: typeof explainAiDevelopmentRecommendation === "function",
    interactionManager: typeof showAiDevelopmentAssistant === "function" && typeof refreshAiDevelopmentAssistant === "function",
    developmentPlanner: typeof buildAiDevelopmentPlan === "function",
    promptBuilder: typeof buildAiDevelopmentPrompt === "function",
    renderer: typeof renderAiDevelopmentAssistant === "function",
    status: typeof getAiDevelopmentAssistantStatus === "function",
    readOnly: true,
    output: false
  };
  const errors = [];

  try {
    const analysis = analyzeAiDevelopmentProject({ issue: "IDE-100 validation" });
    const prompt = buildAiDevelopmentPrompt({ analysis });
    const html = renderAiDevelopmentAssistant(analysis);

    checks.readOnly =
      analysis.readOnly === true &&
      analysis.developerDecisionRequired === true &&
      analysis.context.readOnly === true &&
      analysis.plan.readOnly === true;

    checks.output =
      analysis &&
      Array.isArray(analysis.recommendations) &&
      Array.isArray(analysis.explanations) &&
      analysis.plan &&
      Array.isArray(analysis.plan.steps) &&
      typeof prompt === "string" && prompt.length > 100 &&
      typeof html === "string" && html.length > 100;
  } catch (error) {
    errors.push(error && error.message ? error.message : String(error));
  }

  const failed = Object.keys(checks).filter(key => checks[key] !== true);
  const passed = Object.keys(checks).length - failed.length;
  const total = Object.keys(checks).length;
  const valid = failed.length === 0 && errors.length === 0;
  const result = {
    id: "IDE-100",
    title: "AI Development Assistant",
    version: "1.1",
    specificationVersion: "1.0",
    valid,
    passed,
    total,
    failed,
    checks,
    errors,
    health: Math.round(passed / total * 100),
    progress: Math.round(passed / total * 100),
    readOnly: true,
    releaseReady: valid
  };

  if (writeLog !== false) console.log(result);
  return result;
}

function registerAiDevelopmentAssistantCommand() {
  if (typeof registerCommandPaletteCommand !== "function") return false;
  return registerCommandPaletteCommand({
    id: "ide.ai-development-assistant.open",
    type: "ide",
    title: "Open AI Development Assistant",
    summary: "Knowledge・Repository・Architectureを参照してAI開発支援画面を開きます。",
    category: "IDE",
    keywords: ["ide", "ai", "development", "assistant", "analysis", "knowledge", "architecture", "開発支援"],
    icon: "🤖",
    action() {
      return showAiDevelopmentAssistant();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAiDevelopmentAssistant, { once: true });
} else {
  initAiDevelopmentAssistant();
}

/* ===============================
   IDE-100 Performance Check
=============================== */

function checkAiDevelopmentAssistantPerformance() {

  const results = [];
  let analysis = null;
  let prompt = "";
  let html = "";

  function measure(
    name,
    callback
  ) {

    const startedAt =
      performance.now();

    let error = "";

    try {

      callback();

    } catch (caughtError) {

      error =
        caughtError &&
        caughtError.message
          ? caughtError.message
          : String(caughtError);

    }

    const elapsed =
      performance.now() -
      startedAt;

    const record = {
      name,
      elapsed:
        Number(elapsed.toFixed(2)),
      error
    };

    results.push(
      record
    );

    console.log(
      record.name +
      " : " +
      record.elapsed +
      " ms" +
      (
        record.error
          ? " / Error: " +
            record.error
          : ""
      )
    );

  }

  measure(
    "analyzeAiDevelopmentProject",
    function() {

      analysis =
        analyzeAiDevelopmentProject({
          issue:
            "IDE-100 performance check"
        });

    }
  );

  if (analysis) {

    measure(
      "buildAiDevelopmentPrompt",
      function() {

        prompt =
          buildAiDevelopmentPrompt({
            analysis
          });

      }
    );

    measure(
      "renderAiDevelopmentAssistant",
      function() {

        html =
          renderAiDevelopmentAssistant(
            analysis
          );

      }
    );

  }

  return results;

}

/* ===============================
   IDE-100 Analysis Performance
=============================== */

function checkAiDevelopmentProjectAnalysisPerformance() {

  const results = [];

  let context = null;
  let recommendations = [];
  let explanations = [];
  let plan = null;

  function measure(
    name,
    callback
  ) {

    const startedAt =
      performance.now();

    let error = "";

    try {

      callback();

    } catch (caughtError) {

      error =
        caughtError &&
        caughtError.message
          ? caughtError.message
          : String(caughtError);

    }

    const elapsed =
      performance.now() -
      startedAt;

    const record = {
      name,
      elapsed:
        Number(elapsed.toFixed(2)),
      error
    };

    results.push(
      record
    );

    console.log(
      record.name +
      " : " +
      record.elapsed +
      " ms" +
      (
        record.error
          ? " / Error: " +
            record.error
          : ""
      )
    );

  }

  measure(
    "collectAiDevelopmentContext
