/* ===============================
   FILE: 09_auto_test.js
   AI Auto Test
=============================== */

let latestAiAutoTestPassed = false;

let latestAiAutoTestReport = "";

function buildAiIntegrationVirtualText() {

  const editor =
    get("repairEditor");

  if (!editor) {
    return null;
  }

  if (
    !latestAiIntegrationChanges ||
    !latestAiIntegrationChanges.length
  ) {
    return null;
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

  return {
    text,
    addCount,
    replaceCount,
    skipCount
  };
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

  const pass =
    validation.js_ok &&
    dupFuncs.length === 0;

  const report =
`AI Auto Test Report

=== Result ===
${pass ? "PASS" : "FAIL"}

=== Apply Count ===
add: ${virtual.addCount}
replace: ${virtual.replaceCount}
skip: ${virtual.skipCount}

=== JavaScript ===
${validation.js_ok ? "✔ OK" : "⚠ NG"}
${validation.js_error || ""}

=== Duplicate Functions ===
${dupFuncs.length ? dupFuncs.join("\n") : "✔ none"}

=== Function Count ===
${funcs.length}
`;

  const pass =
    validation.js_ok &&
    dupFuncs.length === 0;

  latestAiAutoTestPassed =
    pass;

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

window.runAiAutoTest =
  runAiAutoTest;

window.copyAiAutoTestReport =
  copyAiAutoTestReport;

console.log(
  "09_auto_test loaded"
);