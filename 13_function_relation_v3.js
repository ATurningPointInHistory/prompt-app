/* ===============================
   FILE:13_function_relation_v3.js
   Function Relation v3
=============================== */

function getProjectDatabaseForRelationV3() {

  if (
    typeof projectDatabase === "undefined" ||
    !projectDatabase ||
    !projectDatabase.functions
  ) {

    if (typeof updateProjectDatabase === "function") {
      updateProjectDatabase();
    }

  }

  if (
    typeof projectDatabase === "undefined" ||
    !projectDatabase ||
    !projectDatabase.functions
  ) {
    return null;
  }

  return projectDatabase;

}

function getFunctionRelationV3Info(
  targetFunctionName
) {

  const database =
    getProjectDatabaseForRelationV3();

  if (!database) {
    return null;
  }

  const functions =
    database.functions || {};

  const modules =
    database.modules || {};

  const target =
    functions[targetFunctionName];

  if (!target) {
    return null;
  }

  const callers =
    (target.calledBy || [])
      .filter(name =>
        name &&
        name !== target.name
      );

  const callees =
    (target.called || [])
      .filter(name =>
        name &&
        name !== target.name &&
        functions[name]
      );

  const relatedFunctionNames =
    [
      target.name,
      ...callers,
      ...callees
    ].filter(Boolean);

  const relatedFiles =
    [
      ...new Set(
        relatedFunctionNames
          .map(name =>
            functions[name]?.fileName
          )
          .filter(Boolean)
      )
    ];

  const relatedModules =
    relatedFiles
      .map(fileName =>
        modules[fileName]
      )
      .filter(Boolean);

  const targetModule =
    modules[target.fileName] || null;

  return {
    target,
    callers,
    callees,
    relatedFiles,
    relatedModules,
    targetModule,
    risk:
      target.risk || "unknown",
    handoffPriority:
      target.handoffPriority || "normal"
  };

}

function buildFunctionRelationV3Report(
  targetFunctionName
) {

  const info =
    getFunctionRelationV3Info(
      targetFunctionName
    );

  if (!info) {
    return [
      "FUNCTION RELATION V3",
      "",
      "対象関数が見つかりません:",
      targetFunctionName || "unknown"
    ].join("\n");
  }

  const target =
    info.target;

  const lines = [];

  lines.push("FUNCTION RELATION V3");
  lines.push("");

  lines.push("=== Target Function ===");
  lines.push(target.name);
  lines.push("");

  lines.push("=== File ===");
  lines.push(target.fileName || "unknown");
  lines.push("");

  lines.push("=== Line ===");
  lines.push(String(target.line || "-"));
  lines.push("");

  lines.push("=== Role ===");
  lines.push(target.role || "-");
  lines.push("");

  lines.push("=== Summary ===");
  lines.push(target.summary || "-");
  lines.push("");

  lines.push("=== Callers ===");
  lines.push(
    info.callers.length
      ? info.callers.join("\n")
      : "none"
  );
  lines.push("");

  lines.push("=== Callees ===");
  lines.push(
    info.callees.length
      ? info.callees.join("\n")
      : "none"
  );
  lines.push("");

  lines.push("=== Related Files ===");
  lines.push(
    info.relatedFiles.length
      ? info.relatedFiles.join("\n")
      : "none"
  );
  lines.push("");

  lines.push("=== Related Module ===");

  if (info.targetModule) {
    lines.push(
      info.targetModule.fileName || "-"
    );
    lines.push(
      info.targetModule.summary || "-"
    );
    lines.push(
      "functions: " +
      (
        info.targetModule.functionCount ||
        info.targetModule.functions?.length ||
        0
      )
    );
  } else {
    lines.push("none");
  }

  lines.push("");

  lines.push("=== Risk ===");
  lines.push(info.risk);
  lines.push("");

  lines.push("=== Handoff Priority ===");
  lines.push(info.handoffPriority);
  lines.push("");

  lines.push("=== AI Minimal Code ===");
  lines.push(
    getFunctionRelationV3MinimalCode(
      targetFunctionName,
      2
    )
  );

  return lines.join("\n");

}

function getFunctionRelationV3MinimalCode(
  targetFunctionName,
  level = 2
) {

  const info =
    getFunctionRelationV3Info(
      targetFunctionName
    );

  if (!info) {
    return "";
  }

  const database =
    getProjectDatabaseForRelationV3();

  const functions =
    database.functions || {};

  const targetFile =
    info.target.fileName;

  let names = [];

  if (level === 1) {

    names = [
      info.target.name
    ];

  } else if (level === 2) {

    names = [
      info.target.name,
      ...info.callees.filter(name =>
        functions[name] &&
        functions[name].fileName === targetFile
      )
    ];

  } else {

    names = [
      info.target.name,
      ...info.callees
    ];

  }

  names =
    [
      ...new Set(names)
    ].filter(name =>
      functions[name] &&
      functions[name].code
    );

  return names
    .map(name => {

      const item =
        functions[name];

      return [
        "/* ===============================",
        "FUNCTION: " + name,
        "FILE: " + (item.fileName || "unknown"),
        "=============================== */",
        item.code.trim()
      ].join("\n");

    })
    .join("\n\n");

}

function showFunctionRelationV3(
  targetFunctionName = ""
) {

  const name =
    targetFunctionName ||
    prompt("対象関数名を入力してください");

  if (!name) {
    return;
  }

  const report =
    buildFunctionRelationV3Report(
      name.trim()
    );

  if (typeof openFloatPanel === "function") {

    openFloatPanel(
      "Function Relation v3",
      `
<div class="float-panel-actions">
  <button onclick="copyFunctionRelationV3('${escapeJs(name.trim())}')">
    📋 コピー
  </button>
</div>

<pre class="code-preview">${escapeHtml(report)}</pre>
`
    );

    return;
  }

  alert(report);

}

function copyFunctionRelationV3(
  targetFunctionName
) {

  const report =
    buildFunctionRelationV3Report(
      targetFunctionName
    );

  copyTextFallback(report);

}

/* ===============================
   Global Export
=============================== */

window.getFunctionRelationV3Info =
  getFunctionRelationV3Info;

window.buildFunctionRelationV3Report =
  buildFunctionRelationV3Report;

window.getFunctionRelationV3MinimalCode =
  getFunctionRelationV3MinimalCode;

window.showFunctionRelationV3 =
  showFunctionRelationV3;

window.copyFunctionRelationV3 =
  copyFunctionRelationV3;