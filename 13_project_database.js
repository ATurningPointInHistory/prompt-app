/* ===============================
   FILE: 13_project_database.js
   Project Database
=============================== */

let projectDatabase = {
  version: "1.0.0",
  analyzedAt: "",
  sourceMode: "",
  files: {},
  modules: {},
  functions: {},
  statistics: {}
};

function buildProjectDatabase(
  sources,
  options = {}
) {

  const mode =
    options.mode ||
    (
      typeof getCurrentProjectAnalyzeMode === "function"
        ? getCurrentProjectAnalyzeMode()
        : "editor"
    );

  const functionDb =
    typeof buildProjectFunctionDatabase === "function"
      ? buildProjectFunctionDatabase(
          sources || []
        )
      : {};

  const modules =
    buildProjectModuleDatabase(
      sources || [],
      functionDb
    );

  projectDatabase = {
    version: "1.0.0",
    analyzedAt:
      new Date().toISOString(),
    sourceMode:
      mode,
    files:
      buildProjectFileDatabase(
        sources || []
      ),
    modules,
    functions:
      enrichProjectFunctionDatabaseV2(
        functionDb,
        modules,
        mode
      ),
    statistics:
      buildProjectDatabaseStatistics(
        sources || [],
        functionDb,
        modules
      )
  };

  window.projectDatabase =
    projectDatabase;

  window.projectFunctionDatabase =
    projectDatabase.functions;

  return projectDatabase;

}

function buildProjectFileDatabase(
  sources
) {

  const files = {};

  (sources || []).forEach(source => {

    const fileName =
      source.fileName ||
      source.name ||
      "unknown";

    const code =
      source.code ||
      source.text ||
      source.content ||
      source.value ||
      "";

    files[fileName] = {
      fileName,
      lineCount:
        code
          ? code.split(/\r?\n/).length
          : 0,
      charCount:
        code.length || 0,
      updatedAt:
        Date.now()
    };

  });

  return files;

}

function buildProjectModuleDatabase(
  sources,
  functionDb
) {

  const modules = {};

  (sources || []).forEach(source => {

    const fileName =
      source.fileName ||
      source.name ||
      "unknown";

    const code =
      source.code ||
      source.text ||
      source.content ||
      source.value ||
      "";

    const functions =
      Object
        .values(functionDb || {})
        .filter(fn =>
          fn.fileName === fileName
        )
        .map(fn =>
          fn.name
        );

    modules[fileName] = {
      fileName,
      role:
        guessModuleRole(
          fileName,
          code
        ),
      summary:
        guessModuleSummary(
          fileName,
          functions
        ),
      keywords:
        typeof extractModuleKeywords === "function"
          ? extractModuleKeywords(code)
          : [],
      functions,
      functionCount:
        functions.length,
      lineCount:
        code
          ? code.split(/\r?\n/).length
          : 0,
      risk:
        guessModuleRisk(
          fileName,
          functions.length
        )
    };

  });

  return modules;

}

function enrichProjectFunctionDatabaseV2(
  functionDb,
  modules,
  sourceMode
) {

  const result = {};

  Object
    .values(functionDb || {})
    .forEach(fn => {

      if (!fn || !fn.name) {
        return;
      }

      const code =
        fn.code || "";

      const parameters =
        extractFunctionParametersFromCode(
          code
        );

      result[fn.name] = {
        ...fn,

        source:
          sourceMode || "",

        section:
          guessFunctionSection(
            fn.fileName || "",
            fn.name || ""
          ),

        role:
          guessFunctionRole(
            fn.name || ""
          ),

        summary:
          guessFunctionSummary(
            fn.name || "",
            fn.fileName || ""
          ),

        parameters,

        parameterCount:
          parameters.length,

        returnValue:
          guessFunctionReturnValue(
            code
          ),

        codeLength:
          code
            ? code.split(/\r?\n/).length
            : 0,

        risk:
          guessFunctionRisk(
            fn,
            code
          ),

        handoffPriority:
          guessFunctionHandoffPriority(
            fn
          ),

        moduleRole:
          modules &&
          modules[fn.fileName]
            ? modules[fn.fileName].role
            : "",

        aiComment:
          fn.aiComment || ""
      };

    });

  return result;

}

function buildProjectDatabaseStatistics(
  sources,
  functionDb,
  modules
) {

  return {
    fileCount:
      (sources || []).length,

    moduleCount:
      Object.keys(
        modules || {}
      ).length,

    functionCount:
      Object.keys(
        functionDb || {}
      ).length,

    highRiskFunctionCount:
      Object
        .values(functionDb || {})
        .filter(fn =>
          fn.risk === "high"
        ).length
  };

}

function guessModuleRole(
  fileName,
  code
) {

  const name =
    String(fileName || "")
      .toLowerCase();

  if (name.includes("console")) {
    return "Dev Console";
  }

  if (name.includes("health")) {
    return "Health / Diagnose";
  }

  if (name.includes("backup")) {
    return "Backup / Restore";
  }

  if (name.includes("search")) {
    return "Search";
  }

  if (name.includes("repair")) {
    return "Repair IDE";
  }

  if (name.includes("ai")) {
    return "AI Integration";
  }

  if (name.includes("project")) {
    return "Project Config / Database";
  }

  return "General Module";

}

function guessModuleSummary(
  fileName,
  functions
) {

  return `${fileName} / functions: ${
    (functions || []).length
  }`;

}

function guessModuleRisk(
  fileName,
  functionCount
) {

  const name =
    String(fileName || "")
      .toLowerCase();

  if (
    name.includes("backup") ||
    name.includes("health") ||
    name.includes("repair") ||
    name.includes("init")
  ) {
    return "high";
  }

  if (functionCount > 40) {
    return "medium";
  }

  return "low";

}

function guessFunctionSection(
  fileName,
  functionName
) {

  const text =
    `${fileName} ${functionName}`
      .toLowerCase();

  if (text.includes("console")) {
    return "Dev Console";
  }

  if (text.includes("health")) {
    return "Health";
  }

  if (text.includes("backup")) {
    return "Backup";
  }

  if (text.includes("search")) {
    return "Search";
  }

  if (text.includes("repair")) {
    return "Repair";
  }

  if (text.includes("ai")) {
    return "AI";
  }

  if (text.includes("macro")) {
    return "Macro";
  }

  if (text.includes("project")) {
    return "Project";
  }

  return "General";

}

function guessFunctionRole(
  name
) {

  if (name.startsWith("show")) {
    return "UI表示";
  }

  if (name.startsWith("build")) {
    return "HTMLまたはデータ構築";
  }

  if (name.startsWith("get")) {
    return "値取得";
  }

  if (name.startsWith("set")) {
    return "値設定";
  }

  if (name.startsWith("save")) {
    return "保存";
  }

  if (name.startsWith("load")) {
    return "読込";
  }

  if (name.startsWith("update")) {
    return "更新";
  }

  if (name.startsWith("copy")) {
    return "コピー";
  }

  if (name.startsWith("delete")) {
    return "削除";
  }

  if (name.startsWith("analyze")) {
    return "解析";
  }

  if (name.startsWith("render")) {
    return "描画";
  }

  return "処理";

}

function guessFunctionSummary(
  name,
  fileName
) {

  return `${name} / ${fileName}`;

}

function extractFunctionParametersFromCode(
  code
) {

  const text =
    String(code || "");

  const match =
    text.match(
      /function\s+[a-zA-Z_$][\w$]*\s*\(([\s\S]*?)\)/
    );

  if (!match) {
    return [];
  }

  return match[1]
    .split(",")
    .map(item =>
      item.trim()
    )
    .filter(Boolean);

}

function guessFunctionReturnValue(
  code
) {

  return /\breturn\b/.test(
    String(code || "")
  )
    ? "has return"
    : "none";

}

function guessFunctionRisk(
  fn,
  code
) {

  const protectedNames =
    typeof getProtectedFunctionNames === "function"
      ? getProtectedFunctionNames()
      : new Set();

  if (
    protectedNames.has &&
    protectedNames.has(fn.name)
  ) {
    return "high";
  }

  const text =
    `${fn.name} ${fn.fileName}`
      .toLowerCase();

  if (
    text.includes("save") ||
    text.includes("delete") ||
    text.includes("backup") ||
    text.includes("health") ||
    text.includes("repair")
  ) {
    return "medium";
  }

  if (
    String(code || "")
      .split(/\r?\n/)
      .length > 120
  ) {
    return "medium";
  }

  return "low";

}

function guessFunctionHandoffPriority(
  fn
) {

  if (
    fn.risk === "high" ||
    (fn.calledBy || []).length > 5
  ) {
    return "high";
  }

  if (
    (fn.called || []).length > 5
  ) {
    return "medium";
  }

  return "low";

}

function updateProjectDatabase(
  mode
) {

  const useMode =
    mode ||
    (
      typeof getCurrentProjectAnalyzeMode === "function"
        ? getCurrentProjectAnalyzeMode()
        : "editor"
    );

  const sources =
    typeof getProjectAnalyzeSources === "function"
      ? getProjectAnalyzeSources(
          useMode
        )
      : [];

  console.log(
    "updateProjectDatabase sources:",
    useMode,
    sources.length
  );

  const db =
    buildProjectDatabase(
      sources,
      {
        mode:
          useMode
      }
    );

  window.projectDatabase =
    db;

  window.projectFunctionDatabase =
    db.functions || {};

  console.log(
    "updateProjectDatabase functions:",
    Object.keys(
      db.functions || {}
    ).length
  );

  return db;

}

window.projectDatabase =
  projectDatabase;

window.buildProjectDatabase =
  buildProjectDatabase;

window.updateProjectDatabase =
  updateProjectDatabase;

window.buildProjectFileDatabase =
  buildProjectFileDatabase;

window.buildProjectModuleDatabase =
  buildProjectModuleDatabase;

window.enrichProjectFunctionDatabaseV2 =
  enrichProjectFunctionDatabaseV2;