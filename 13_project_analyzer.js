/* ===============================
   FILE: 13_project_analyzer.js
   Project Analyzer
=============================== */

let projectFunctionDatabase = {};

function generateModuleRulesFromLoadedScripts() {

  const editor =
    get("repairEditor");

  if (!editor || !editor.value.trim()) {
    alert("先にJSまたはHTMLをRepair Editorへ読み込んでください");
    return;
  }

  const text =
    editor.value;

  const blocks =
    extractCodeBlocksFromText(text)
      .filter(block =>
        block.type === "function"
      );

  const functionNames =
    blocks.map(block =>
      block.name
    );

  const words =
    [
      ...new Set(
        functionNames
          .flatMap(name =>
            String(name)
              .replace(/([A-Z])/g, " $1")
              .toLowerCase()
              .split(/[^a-z0-9_]+/)
          )
          .filter(word =>
            word &&
            word.length >= 3
          )
      )
    ].slice(0, 20);

  const fileName =
    currentRepairFile ||
    "unknown.js";

  const rule = {
    file: fileName,
    priority: 90,
    words
  };

  const output =
    JSON.stringify(
      rule,
      null,
      2
    );

  openFloatPanel(
    "📊 Module Rule Generator",
    `
<div class="float-panel-actions">

<button onclick="copyGeneratedModuleRule()">
📋 コピー
</button>

</div>

<textarea
id="generatedModuleRuleOutput"
rows="18"
style="
width:100%;
height:60vh;
font-family:monospace;
font-size:11px;
white-space:pre;
overflow:auto;
resize:vertical;
"
>${escapeHtml(output)}</textarea>
`
  );

}

function copyGeneratedModuleRule() {

  const box =
    get("generatedModuleRuleOutput");

  if (!box || !box.value) {
    alert("コピー内容なし");
    return;
  }

  const ok =
    copyTextFallback(
      box.value
    );

  alert(
    ok
      ? "Module Ruleをコピーしました"
      : "コピー失敗"
  );

}


function generateModuleAnalyzer() {

  const editor =
    get("repairEditor");

  if (
    !editor ||
    !editor.value.trim()
  ) {

    alert(
      "Repair Editorへ読み込んでください"
    );

    return;

  }

  const report =
    buildModuleAnalysis(
      editor.value,
      currentRepairFile
    );

  openFloatPanel(

    "📊 Module Analyzer",

    `
<div class="float-panel-actions">

<button
onclick="copyModuleAnalysis()">
📋 コピー
</button>

</div>

<pre class="code-preview">
${escapeHtml(report)}
</pre>

`

  );

  latestModuleAnalysis =
    report;

}

let latestModuleAnalysis =
  "";

function copyModuleAnalysis() {

  if (
    !latestModuleAnalysis
  ) {

    alert("解析結果なし");

    return;

  }

  const ok =
    copyTextFallback(
      latestModuleAnalysis
    );

  alert(
    ok
      ? "Module Analysisをコピーしました"
      : "コピー失敗"
  );

}

function findFunctionInfo(
  functionName,
  code
) {

  const blocks =
    extractFunctionBlocksFromText(
      code
    );

  const block =
    blocks.find(item =>
      item.name === functionName
    );

  if (!block) {
    return null;
  }

  return {

    name:
      block.name,

    line:
      block.startLine ||
      block.line ||
      0,

    called:
      extractCalledFunctions(
        block.code || ""
      ),

    keywords:
      extractModuleKeywords(
        block.code || ""
      )

  };

}

function getAnalyzeSourcesFromEditor() {

  const editor =
    get("repairEditor");

  if (
    !editor ||
    !editor.value
  ) {
    return [];
  }

  return [
    {
      fileName:
        currentRepairFile ||
        "Editor",
      code:
        editor.value
    }
  ];

}

function getAnalyzeSourcesFromCurrentProject() {

  const candidates = [
    window.currentProjectSearchFiles,
    window.repairSearchFiles,
    window.projectSearchFiles,
    window.loadedProjectFiles,
    window.currentProjectFiles,
    window.searchFileList
  ];

  for (const list of candidates) {

    if (!Array.isArray(list)) {
      continue;
    }

    const sources =
      list
        .map(file => ({
          fileName:
            file.name ||
            file.fileName ||
            file.path ||
            "unknown",
          code:
            file.text ||
            file.code ||
            file.content ||
            file.value ||
            ""
        }))
        .filter(file =>
          file.code
        );

    if (sources.length) {
      return sources;
    }

  }

  return [];

}

function getAnalyzeSourcesFromLoadedFiles() {

  if (
    Array.isArray(window.repairSearchFiles)
  ) {
    return window.repairSearchFiles
      .map(file => ({
        fileName:
          file.name ||
          file.fileName ||
          "unknown",
        code:
          file.text ||
          file.code ||
          ""
      }))
      .filter(file =>
        file.code
      );
  }

  return [];

}

function buildProjectFunctionDatabase(
  sources
) {

  const database = {};

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

    if (!code) {
      return;
    }

    const blocks =
      extractFunctionBlocksFromText(
        code
      );

    blocks.forEach(block => {

      if (!block.name) {
        return;
      }

      const blockCode =
        block.code ||
        block.block ||
        "";

      database[block.name] = {
        name:
          block.name,

        fileName,

        line:
          block.startLine ||
          block.line ||
          0,

        start:
          block.start ||
          0,

        end:
          block.end ||
          0,

        type:
          block.type ||
          "function",

        code:
          blockCode,

        called:
          filterProjectCalledFunctions(
            extractCalledFunctions(
              blockCode
            )
          ),

        keywords:
          extractModuleKeywords(
            blockCode
          )
      };

    });

  });

  enrichProjectFunctionDatabase(
    database
  );

  projectFunctionDatabase =
    database;

  window.projectFunctionDatabase =
    database;

  return database;

}

function updateProjectFunctionDatabase(
  mode = "editor"
) {

  currentProjectAnalyzeMode =
    mode;

  const sources =
    getProjectAnalyzeSources(
      mode
    );

  const database =
    buildProjectFunctionDatabase(
      sources
    );

  updateRepairStatus?.(
    `Function DB : ${Object.keys(database).length}件 (${mode})`
  );

  return database;

}

function getFunctionDatabase() {

  return projectFunctionDatabase;

}

function getFunctionInfoFromDatabase(
  name
) {

  return (
    projectFunctionDatabase[
      name
    ] || null
  );

}

function getAllFunctionNames() {

  return Object
    .keys(
      projectFunctionDatabase
    )
    .sort();

}

function searchFunctionDatabase(
  keyword
) {

  keyword =
    String(
      keyword || ""
    )
      .trim()
      .toLowerCase();

  if (!keyword) {
    return [];
  }

  return Object
    .values(
      projectFunctionDatabase
    )
    .filter(item =>

      item.name
        .toLowerCase()
        .includes(keyword)

      ||

      item.fileName
        .toLowerCase()
        .includes(keyword)

      ||

      item.keywords.some(word =>
        word.includes(keyword)
      )

    );

}

function getAnalyzeSourcesFromCurrentProject() {

  return getRepairSearchFiles();

}

function filterProjectCalledFunctions(
  names
) {

  let ignore =
    new Set();

  if (
    typeof getIgnoredFunctionCalls === "function"
  ) {
    ignore =
      getIgnoredFunctionCalls();
  }

  return (names || [])
    .filter(name =>
      name &&
      !ignore.has(name)
    );

}

function enrichProjectFunctionDatabase(
  database
) {

  Object.values(database)
    .forEach(item => {

      item.calledBy = [];
      item.callCount = 0;

    });

  Object.values(database)
    .forEach(caller => {

      (caller.called || [])
        .forEach(calledName => {

          const target =
            database[calledName];

          if (!target) {
            return;
          }

          if (
            !Array.isArray(
              target.calledBy
            )
          ) {
            target.calledBy = [];
          }

          if (
            !target.calledBy.includes(
              caller.name
            )
          ) {
            target.calledBy.push(
              caller.name
            );
          }

          target.callCount =
            Number(target.callCount || 0) + 1;

        });

    });

  return database;

}

window.buildProjectFunctionDatabase =
  buildProjectFunctionDatabase;

window.updateProjectFunctionDatabase =
  updateProjectFunctionDatabase;

window.generateModuleRulesFromLoadedScripts =
  generateModuleRulesFromLoadedScripts;

window.copyGeneratedModuleRule =
  copyGeneratedModuleRule;

window.generateModuleAnalyzer =
  generateModuleAnalyzer;

window.copyModuleAnalysis =
  copyModuleAnalysis;

window.findFunctionInfo =
  findFunctionInfo;

window.getProjectAnalyzeSources =
  getProjectAnalyzeSources;

window.getFunctionDatabase =
  getFunctionDatabase;

window.getFunctionInfoFromDatabase =
  getFunctionInfoFromDatabase;

window.getAllFunctionNames =
  getAllFunctionNames;

window.searchFunctionDatabase =
  searchFunctionDatabase;

window.enrichProjectFunctionDatabase =
  enrichProjectFunctionDatabase;

console.log(
  "13_project_analyzer loaded"
);