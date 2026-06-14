/* ===============================
   FILE: 08_ai_test.js
   AI Test Runner
=============================== */

let latestAiAutoTestPassed = false;

let latestAiAutoTestReport = "";

function testAiIntegrationSandbox() {

  const editor =
    get("repairEditor");

  if (!editor) {
    alert("repairEditorなし");
    return;
  }

  if (
    !latestAiIntegrationChanges ||
    !latestAiIntegrationChanges.length
  ) {
    alert("Sandbox対象なし");
    return;
  }

  let text =
    editor.value;

  let addCount = 0;
  let replaceCount = 0;
  let skipCount = 0;

  latestAiIntegrationChanges.forEach(change => {

    if (change.type === "same") {
      skipCount++;
      return;
    }

    if (change.type === "replace") {

      const block =
        findFunctionBlockInText(
          text,
          change.name
        );

      if (!block) {
        skipCount++;
        return;
      }

      text =
        text.slice(0, block.start) +
        change.newCode +
        text.slice(block.end);

      replaceCount++;
      return;
    }

    if (change.type === "add") {

      const exists =
        findFunctionBlockInText(
          text,
          change.name
        );

      if (exists) {
        skipCount++;
        return;
      }

      text +=
        "\n\n" +
        change.newCode;

      addCount++;
    }

  });

  const health =
    validateBackupHtml(text);

  const report =
`AI Integration Sandbox

=== Result ===
${health.js_ok ? "✔ OK" : "⚠ NG"}

=== Count ===
add: ${addCount}
replace: ${replaceCount}
skip: ${skipCount}

=== JS Error ===
${health.js_error || "none"}
`;

  openFloatPanel(
    "AI Sandbox",
    `
<pre class="code-preview">
${escapeHtml(report)}
</pre>
`
  );
}

function runAiAutoTest() {

  const virtual =
    buildAiIntegrationVirtualText();

  if (!virtual) {
    alert("AutoTest対象なし");
    return;
  }

  const validation =
    validateBackupHtml(
      virtual.text
    );

  const funcs =
    extractFunctionNames(
      virtual.text
    );

  const dupFuncs =
    [...new Set(
      funcs.filter(
        (f, i) =>
          funcs.indexOf(f) !== i
      )
    )];

  const aiDupFuncs =
    detectAiInputDuplicateFunctions();

  const undefinedOnclicks =
    detectUndefinedOnclicksInText(
      virtual.text
    );

  const missingCalls =
    detectMissingFunctionCallsInText(
      virtual.text
    );

  const protectedChanges =
    detectProtectedAiChanges();

  const missingCriticalFunctions =
    detectMissingCriticalFunctionsInText(
      virtual.text
    );

  const results = {
    jsOk: validation.js_ok,
    dupFuncs,
    aiDupFuncs,
    undefinedOnclicks,
    missingCalls,
    protectedChanges,
    missingCriticalFunctions
  };

  const healthScore =
    calcAiAutoHealthScore(
      results
    );

  const pass =
    validation.js_ok &&
    dupFuncs.length === 0 &&
    aiDupFuncs.length === 0 &&
    undefinedOnclicks.length === 0 &&
    protectedChanges.length === 0;

  latestAiAutoTestPassed =
    pass;

  const report =
`AI Auto Test Report

=== Result ===
${pass ? "PASS" : "FAIL"}

=== Health Score ===
${healthScore}/100

=== Apply Count ===
add: ${virtual.addCount}
replace: ${virtual.replaceCount}
skip: ${virtual.skipCount}

=== JavaScript ===
${validation.js_ok ? "✔ OK" : "⚠ NG"}
${validation.js_error || ""}

=== Duplicate Functions ===
${dupFuncs.length ? dupFuncs.join("\n") : "✔ none"}

=== AI Input Duplicate Functions ===
${aiDupFuncs.length ? aiDupFuncs.join("\n") : "✔ none"}

=== Undefined onclick ===
${undefinedOnclicks.length ? undefinedOnclicks.join("\n") : "✔ none"}

=== Missing Function Calls ===
${missingCalls.length ? missingCalls.join("\n") : "✔ none"}

=== Protected Function Changes ===
${protectedChanges.length ? protectedChanges.join("\n") : "✔ none"}

=== Missing Critical Functions ===
${missingCriticalFunctions.length ? missingCriticalFunctions.join("\n") : "✔ none"}

=== Function Count ===
${funcs.length}
`;

  latestAiAutoTestReport =
    report;

  openFloatPanel(
    "AI AutoTest",
    `
<div class="float-panel-actions">
  <button onclick="copyAiAutoTestReport()">
    📋 コピー
  </button>
</div>

<pre class="code-preview">
${escapeHtml(report)}
</pre>
`
  );
}

function calcAiAutoHealthScore(results) {

  let score = 100;

  if (!results.jsOk) {
    score -= 40;
  }

  if (results.dupFuncs.length) {
    score -= 20;
  }

  if (results.aiDupFuncs.length) {
    score -= 20;
  }

  if (results.undefinedOnclicks.length) {
    score -= 20;
  }

  if (results.missingCalls.length) {
    score -= 10;
  }

  if (results.protectedChanges.length) {
    score -= 30;
  }

  return Math.max(
    0,
    score
  );
}

function copyAiAutoTestReport() {

  if (!latestAiAutoTestReport) {
    alert("コピー内容なし");
    return;
  }

  const ok =
    copyTextFallback(
      latestAiAutoTestReport
    );

  alert(
    ok
      ? "AutoTest結果をコピーしました"
      : "コピー失敗"
  );
}
