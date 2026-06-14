/* ===============================
   FILE: 01_core.js
   Core / Utility / Constants
=============================== */

/* ===============================
   Core State / Constants
=============================== */

let currentTab = 1;
let isLoading = false;
let healthUnusedFunctions = [];
let selectedUnusedFunctions = [];
let healthUndefinedFunctions = [];
let lastDeleteRollbackHtml = "";
let lastDeleteRollbackInfo = "";
let unusedDeleteHistory = [];
const APP_VERSION = "v5.8.3";
const DEBUG_MODE = true;
const CHANGELOG = [
  "Health Garbage Check誤検知削減",
  "test1"
];
const BUILD_INFO = {
  version: APP_VERSION,
  build: "2026-06-08 17:00",
  note: "Health改善"
};

function renderBuildInfo() {

  const versionEl =
    get("versionLabel");

  const buildEl =
    get("buildInfoLabel");

  if (versionEl) {
    versionEl.textContent =
      BUILD_INFO.version;
  }

  if (buildEl) {
    buildEl.innerHTML =
      "Build: " +
      BUILD_INFO.build +
      "<br>" +
      BUILD_INFO.note;
  }

}

function safeRun(fn, name) {

  if (typeof fn !== "function") {
    console.warn(
      name + " is not defined"
    );
    return false;
  }

  try {
    fn();
    return true;
  } catch (e) {
    console.warn(
      name + " failed:",
      e
    );
    return false;
  }
}

/* ===============================
   Core DOM Helpers
=============================== */

const get = (id) => document.getElementById(id);

function copyTextFallback(text) {

  const textarea =
    document.createElement("textarea");

  textarea.value =
    String(text || "");

  textarea.style.position =
    "fixed";

  textarea.style.left =
    "-9999px";

  textarea.style.top =
    "0";

  document.body.appendChild(
    textarea
  );

  textarea.focus();
  textarea.select();

  let ok = false;

  try {
    ok =
      document.execCommand(
        "copy"
      );
  } catch {
    ok = false;
  }

  document.body.removeChild(
    textarea
  );

  return ok;
}

/* ===============================
   Core Escape Helpers
=============================== */

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ===============================
   Core Storage Helpers
=============================== */

function loadJson(key, fallback) {
  try {
    return JSON.parse(
      localStorage.getItem(key) || JSON.stringify(fallback)
    );
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

/* ===============================
   Default Data
=============================== */

const defaultTemplates = [
  {
    name: "AIオーケストレーター",
    role: "AIオーケストレーター",
    task: "ユーザーの質問に対して最適なロールを生成して回答する",
    details: `あなたは「AIオーケストレーター」です。

ユーザーの質問に対して、最適な専門ロール（ジョブ）を自動生成・選定し、そのロールとして回答してください。

【処理手順】
① 質問の意図を分析する
② 必要なロールを3〜5個生成する
③ 各ロールの役割を簡潔に説明する
④ 最適なロールを1つ選び、理由を述べる
⑤ 選ばれたロールとして最終回答を行う

【条件】
・ロールは具体的かつ専門的にする
・最終回答は選ばれたロールになりきる
・無駄な説明は省き、論理的に出力する

【出力形式】
1. 意図分析
2. ロール候補
3. 最適ロールと選定理由
4. 最終回答`,
    tone: "プロフェッショナル"
  }
];

const defaultDangerWords = [
  "パスワード",
  "住所",
  "電話番号",
  "メールアドレス",
  "マイナンバー",
  "クレジットカード",
  "カード番号",
  "暗証番号",
  "口座番号",
  "銀行口座",
  "本人確認書類",
  "運転免許証",
  "保険証",
  "秘密の質問",
  "生年月日"
];

const defaultPatterns = [
  { name: "メールアドレス", regex: "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}", flags: "g" },
  { name: "電話番号", regex: "(?:\\+?\\d{1,3}[-\\s]?)?(?:\\d{2,4}[-\\s]?){2,4}\\d{3,4}", flags: "g" },
  { name: "郵便番号", regex: "\\b\\d{3}-?\\d{4}\\b", flags: "g" },
  { name: "クレジットカード候補", regex: "\\b(?:\\d[ -]*?){13,16}\\b", flags: "g" },
  { name: "マイナンバー候補", regex: "\\b\\d{12}\\b", flags: "g" }
];

const commandDefinitions = {
  tldr: "要点を短く箇条書きでまとめる",
  eli15: "専門用語を減らし、15歳でも理解できる説明にする",
  human: "AIっぽさを減らし、自然な文章にする",
  step: "実行可能な手順に分解する",
  enemy: "弱点・リスク・反論を洗い出す",
  real: "事実・推測・不明点を分けて、根拠重視で回答する",
  gap: "不足情報・確認すべき点を洗い出す",
  sort: "内容をカテゴリ別に整理する",
  priority: "重要度・実装優先度を整理する",
  schema: "JSONスキーマやデータ構造に変換する",
  code: "実装コード案を出す",
  test: "テスト観点を作る",
  prompt: "生成AI向けの高品質プロンプトに再構成する"
};

const presetDefinitions = {
  "要約": ["tldr", "sort"],
  "初心者向け": ["eli15", "step"],
  "設計レビュー": ["enemy", "gap", "priority"],
  "実装支援": ["step", "code", "test"],
  "JSON設計": ["schema", "real", "prompt"]
};

const aiPresetDefinitions = {

  chatgpt: {
    name: "ChatGPT",
    instruction:
      "役割、目的、条件、制約、出力形式、トーンを明確に整理してください。"
  },

  claude: {
    name: "Claude",
    instruction:
      "背景、意図、考慮点、判断理由を自然文中心で整理してください。"
  },

  gemini: {
    name: "Gemini",
    instruction:
      "目的、必要な出力、条件を短く明確に整理してください。"
  },

  cursor: {
    name: "Cursor",
    instruction:
      "目的、問題、期待動作、制約、修正方針を明確に整理してください。"
  },

  copilot: {
    name: "Copilot",
    instruction:
      "Goal、Context、Expected behavior、Constraints を短いコメント形式で整理してください。"
  }

};

/* ===============================
   AI Preset Core
=============================== */

function getAiPresets() {
  const saved = loadJson("aiPresets", null);

  if (!saved) {
    return aiPresetDefinitions;
  }

  return {
    ...aiPresetDefinitions,
    ...saved
  };
}

function saveAiPresets(presets) {
  localStorage.setItem("aiPresets", JSON.stringify(presets));
}

function getAiPreset(aiTarget) {
  const presets = getAiPresets();
return presets[aiTarget] || presets.chatgpt;
}

/* ===============================
   Project Config
=============================== */

function getProjectConfig() {

  const saved =
    loadJson(
      "projectConfig",
      null
    );

  if (
    saved &&
    typeof saved === "object"
  ) {
    return normalizeProjectConfig(
      saved
    );
  }

  return normalizeProjectConfig(
    getDefaultProjectConfig()
  );

}

function getProjectModuleRules() {

  return [
    {
      file: "00_bootstrap.js",
      words: [
        "float",
        "panel",
        "menu",
        "bootstrap",
        "switchapp"
      ]
    },
    {
      file: "01_core.js",
      words: [
        "escape",
        "copy",
        "helper",
        "util",
        "safe"
      ]
    },
    {
      file: "02_prompt.js",
      words: [
        "prompt",
        "review",
        "convert",
        "command",
        "generate"
      ]
    },
    {
      file: "03_data.js",
      words: [
        "save",
        "load",
        "history",
        "storage",
        "state"
      ]
    },
    {
      file: "04_tools.js",
      words: [
        "template",
        "danger",
        "pattern",
        "preset",
        "todo",
        "devlog"
      ]
    },
    {
      file: "05_repair.js",
      words: [
        "repair",
        "undo",
        "redo",
        "editor",
        "functionsort",
        "diff"
      ]
    },
    {
      file: "06_search.js",
      words: [
        "search",
        "replace",
        "highlight",
        "cursor"
      ]
    },
    {
      file: "07_backup_health.js",
      words: [
        "backup",
        "health",
        "diagnose",
        "dependency",
        "validate"
      ]
    },
    {
      file: "08_ai_integrator.js",
      words: [
        "ai",
        "integration",
        "classifier",
        "relation",
        "graph",
        "map"
      ]
    }
  ];

}



function getIgnoredFunctionCalls() {

  return new Set([
    "alert",
    "confirm",
    "prompt",
    "trim",
    "filter",
    "map",
    "forEach",
    "find",
    "findIndex",
    "slice",
    "split",
    "join",
    "includes",
    "indexOf",
    "match",
    "matchAll",
    "replace",
    "toLowerCase",
    "toUpperCase",
    "querySelector",
    "querySelectorAll",
    "setItem",
    "stringify",
    "min",
    "max",
    "log",
    "get",
    "add",
    "has",
    "if",
    "return",
    "String",
    "RegExp",
    "Map",
    "Set",
    "push",
    "test",
    "b"
  ]);

}

function getCriticalFunctionNames() {

  return new Set([
    "loadSettings",
    "saveCurrentState",
    "initRepairIde",
    "loadRepairHtml",
    "saveRepairHtml",
    "showHtmlHealth",
    "validateBackupHtml",
    "applyAiIntegration",
    "runAiAutoTest",
    "rollbackLastDelete"
  ]);

}

function getProtectedFunctionNames() {

  return new Set([
    "loadRepairHtml",
    "saveRepairHtml",
    "copyRepairHtml",
    "showHtmlHealth",
    "validateBackupHtml",
    "getHtmlSummary",
    "collectExternalScriptText",
    "checkSafeMode",
    "safeRun",
    "rollbackLastDelete",
    "saveDeleteRollbackSnapshot",
    "updateLineNumbers",
    "updateCursorPosition",
    "autoSaveRepairDraft",
    "initRepairIde",
    "loadSettings",
    "detectProtectedAiChanges",
    "getAllProtectedFunctionNames",
    "getProtectedFunctionNames"
  ]);
}

function getDefaultProjectConfig() {

  return {

    moduleRules:
      getProjectModuleRules(),

    protectedFunctions:
      [...getProtectedFunctionNames()],

    ignoreFunctionCalls:
      [...getIgnoredFunctionCalls()],

    criticalFunctions:
      [...getCriticalFunctionNames()]

  };

}

function normalizeProjectConfig(config) {

  return {

    moduleRules:
      Array.isArray(
        config.moduleRules
      )
        ? config.moduleRules
        : getProjectModuleRules(),

    protectedFunctions:
      new Set(
        config.protectedFunctions ||
        [...getProtectedFunctionNames()]
      ),

    ignoreFunctionCalls:
      new Set(
        config.ignoreFunctionCalls ||
        [...getIgnoredFunctionCalls()]
      ),

    criticalFunctions:
      new Set(
        config.criticalFunctions ||
        [...getCriticalFunctionNames()]
      )

  };

}

/* ===============================
   Function Reference Extractor
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

  addEventListenerFunction:
    buildAppRegex(
      `addEventListener\\s*\\([^)]*,\\s*(${APP_REGEX_PARTS.jsName})`
    ),

  windowAssignedFunction:
    buildAppRegex(
      `window\\.[a-zA-Z_$][a-zA-Z0-9_$]*\\s*=\\s*(${APP_REGEX_PARTS.jsName})`
    ),

  labelFor:
    /for\s*=\s*["']([^"']+)["']/g
};

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

    labelFors:
      [...htmlText.matchAll(APP_REGEX.labelFor)]
        .map(x => x[1])
  };
}