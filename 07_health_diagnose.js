function calcHealthScore(validation, undefinedFns, dupFuncs) {
  return Math.max(
    0,
    100
    - (validation.div_ok ? 0 : 20)
    - (validation.js_ok ? 0 : 25)
    - (validation.duplicate_ids.length * 5)
    - (undefinedFns.length * 10)
    - (dupFuncs.length * 10)
  );
}

function copyHealthResult() {
  const text =
    window.latestHealthResult || "";
  if (!text) {
    alert("コピー内容なし");
    return;
  }
  if (
    navigator.clipboard &&
    window.isSecureContext
  ) {
    navigator.clipboard
      .writeText(text)
      .then(()=>
        alert("コピー完了")
      )
      .catch(()=>{
        const ok =
          copyTextFallback(text);
        alert(
          ok
          ? "コピー完了"
          : "コピー失敗"
        );
      });
    return;
  }
  const ok =
    copyTextFallback(text);
  alert(
    ok
    ? "コピー完了"
    : "コピー失敗"
  );
}

function copyDiagnoseResult() {
  const text =
    window.latestDiagnoseResult || "";
  if (!text) {
    alert("コピー内容なし");
    return;
  }
  if (
    navigator.clipboard &&
    window.isSecureContext
  ) {
    navigator.clipboard
      .writeText(text)
      .then(() =>
        alert("コピー完了")
      )
      .catch(() => {
        const ok =
          copyTextFallback(text);
        alert(
          ok
            ? "コピー完了"
            : "コピー失敗"
        );
      });
    return;
  }
  const ok =
    copyTextFallback(text);
  alert(
    ok
      ? "コピー完了"
      : "コピー失敗"
  );
}

function diagnoseHtml() {
  let html =
    "<!DOCTYPE html>\n" +
    document.documentElement.outerHTML;

  const scripts =
    getExternalScriptSrcList(html);

  const scriptInfo =
    scripts.length
      ? "✔ external scripts:\n" +
        scripts.join("\n")
      : "✔ external scripts:none";

  html = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");

  const report = [];

  report.push("AIプロンプト生成Pro HTML診断");
  report.push("v5.7.2 Diagnose External JS\n");

  const tags = [
    "div",
    "section",
    "article",
    "main",
    "header",
    "footer"
  ];

  tags.forEach(tag => {
    const open =
      (html.match(
        new RegExp(`<${tag}\\b`, "gi")
      ) || []).length;

    const close =
      (html.match(
        new RegExp(`</${tag}>`, "gi")
      ) || []).length;

    report.push(
      open === close
        ? `✔ ${tag}: ${open}/${close}`
        : `⚠ ${tag}: ${open}/${close}`
    );
  });

  const ids =
    [...document.querySelectorAll("[id]")]
      .map(el => el.id);

  const dupIds =
    [...new Set(
      ids.filter(
        (id, i) =>
        ids.indexOf(id) !== i
      )
    )];

  report.push(
    dupIds.length
      ? `⚠ id重複\n${dupIds.join("\n")}`
      : "✔ id重複なし"
  );

  report.push("");
  report.push(scriptInfo);

  try {
    [...document.scripts].forEach(s => {
      if (s.src) return;
      new Function(s.textContent);
    });

    report.push("");
    report.push("✔ JS構文OK");

  } catch (e) {
    report.push("");
    report.push(
      `⚠ JS構文エラー\n${e.message}`
    );
  }

  const box =
    get("diagnoseBox");

  box.style.display =
    "block";

  box.innerText =
    report.join("\n");
}

async function diagnoseRepairHtml() {
  const editor =
    get("repairEditor");

  if (!editor || !editor.value.trim()) {
    alert("修復モードでHTMLを読み込んでから実行してください");
    return;
  }

  const html =
    editor.value;

  const externalJs =
    await collectExternalScriptText(html);

  const jsForCheck =
    html + "\n" + externalJs;

  const scripts =
    getExternalScriptSrcList(html);

  const scriptInfo =
    scripts.length
      ? "✔ external scripts:\n" +
        scripts.join("\n")
      : "✔ external scripts:none";

  const parser =
    new DOMParser();

  const doc =
    parser.parseFromString(
      html,
      "text/html"
    );

  let cleanHtml =
    html
      .replace(
        /<script[\s\S]*?<\/script>/gi,
        ""
      )
      .replace(
        /<style[\s\S]*?<\/style>/gi,
        ""
      );

  const report = [];

  report.push(
    "Repair HTML Diagnose\n"
  );

  // div整合性
  const open =
    (cleanHtml.match(/<div\b/g) || []).length;

  const close =
    (cleanHtml.match(/<\/div>/g) || []).length;

  report.push(
    open === close
      ? `✔ div: ${open}/${close}`
      : `⚠ div: ${open}/${close}`
  );

  // DOM解析
  const parserError =
    doc.querySelector("parsererror");

  report.push(
    parserError
      ? "⚠ DOM解析エラー"
      : "✔ DOM解析OK"
  );

  // id重複
  const ids =
    [...doc.querySelectorAll("[id]")]
      .map(el => el.id)
      .filter(Boolean)
      .filter(id =>
        !id.startsWith("cleanup-")
      );

  const dupIds =
    [...new Set(
      ids.filter(
        (id, i) =>
          ids.indexOf(id) !== i
      )
    )];

  report.push(
    dupIds.length
      ? `⚠ id重複 (${dupIds.length})\n${dupIds.join("\n")}`
      : "✔ id重複なし"
  );

  report.push("");
  report.push(scriptInfo);

  // JS構文
  try {
    const scriptBlocks =
      [...doc.querySelectorAll("script")];

    scriptBlocks.forEach(s => {
      if (s.src) return;

      new Function(
        s.textContent
      );
    });

    report.push(
      "✔ JS構文OK"
    );

  } catch (e) {
    report.push(
      `⚠ JS構文エラー\n${e.message}`
    );
  }

  // コメント除去後にfunction検出
  const htmlForFunctionCheck =
    jsForCheck
      .replace(/\/\/.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");

  const functionBlocks =
    extractFunctionBlocksFromText(
      htmlForFunctionCheck
    );
  
  const funcs =
    functionBlocks.map(item => item.name);
  
  const dupFuncs =
    [...new Set(
      funcs.filter(
        (f, i) =>
          funcs.indexOf(f) !== i
      )
    )];

  report.push(
    dupFuncs.length
      ? `⚠ function重複 (${dupFuncs.length})\n${dupFuncs.join("\n")}`
      : "✔ function重複なし"
  );

  // onclick定義確認

  const refs =
    extractFunctionReferences(
      jsForCheck,
      html
    );
  
  const onclicks =
    refs.onclicks;
  
  const eventRefs =
    refs.eventRefs;
  
  const windowRefs =
    refs.windowRefs;
  
  const labelFors =
    refs.labelFors;

  const undefinedFns =
    [...new Set(
      onclicks.filter(
        fn =>
          !funcs.includes(fn)
      )
    )];

  report.push(
    undefinedFns.length
      ? `⚠ 未定義onclick (${undefinedFns.length})\n${undefinedFns.join("\n")}`
      : "✔ onclick定義OK"
  );

  // 未使用function
   const config =
    typeof getProjectConfig === "function"
      ? getProjectConfig()
      : {};
  
  const systemIgnoreFuncs =
    typeof getSystemIgnoreFunctions === "function"
      ? getSystemIgnoreFunctions()
      : new Set();
  
  const safeIgnoreFuncs =
    new Set([
      ...(
        config.protectedFunctions || []
      ),
      ...(
        config.criticalFunctions || []
      ),
      ...systemIgnoreFuncs
    ]);

  const unusedFns =
    funcs.filter(fn => {

      if (safeIgnoreFuncs.has(fn)) {
        return false;
      }

      if (
        jsForCheck.includes(
          "cleanup候補: 未使用function " + fn
        )
      ) {
        return false;
      }

      if (onclicks.includes(fn)) {
        return false;
      }

      if (eventRefs.includes(fn)) {
        return false;
      }

      if (windowRefs.includes(fn)) {
        return false;
      }

      const useCount =
        countFunctionReferences(
          jsForCheck,
          fn,
          false
        );
      
      return useCount <= 1;
    });

  report.push(
    unusedFns.length
      ? `⚠ 未使用function (${unusedFns.length})\n${
          unusedFns
            .slice(0, 15)
            .join("\n")
        }`
      : "✔ 未使用functionなし"
  );

  // 孤立id
  const safeIgnoreIds =
    typeof getSystemIgnoreIds === "function"
      ? getSystemIgnoreIds()
      : new Set();

  const orphanIds =
    ids.filter(id => {

      if (!id) {
        return false;
      }

      if (safeIgnoreIds.has(id)) {
        return false;
      }

      if (
        html.includes(
          `data-cleanup-disabled-id="${id}"`
        )
      ) {
        return false;
      }

      if (labelFors.includes(id)) {
        return false;
      }

      if (jsForCheck.includes("#" + id)) {
        return false;
      }

      if (/[\$\{\}\(\)\[\]\^\|\\]/.test(id)) {
        return false;
      }

      try {
        const useCount =
          countFunctionReferences(
            jsForCheck,
            id,
            false
          );

        return useCount <= 1;

      } catch {
        return false;
      }
    });

  report.push(
    orphanIds.length
      ? `⚠ 孤立id (${orphanIds.length})\n${
          orphanIds
            .slice(0, 15)
            .join("\n")
        }`
      : "✔ 孤立idなし"
  );

  const result =
    report.join("\n");

  window.latestDiagnoseResult =
    result;

  openFloatPanel(
    "編集内容診断",
    `
    <div class="float-panel-actions">
      <button onclick="copyDiagnoseResult()">
        📋 コピー
      </button>
    </div>
    <pre
      id="diagnoseResultBox"
      class="code-preview">
${escapeHtml(result)}
    </pre>
    `
  );
}

function getHtmlSummary(html) {
  const funcs = extractFunctionNames(html);
  const ids = extractIds(html);
  const validation = validateBackupHtml(html);

  const dupFuncs =
    [...new Set(
      funcs.filter((f, i) => funcs.indexOf(f) !== i)
    )];

  const onclicks =
    [...String(html || "").matchAll(
      /onclick="([a-zA-Z0-9_$]+)\(/g
    )].map(x => x[1]);

  const undefinedFns =
    [...new Set(
      onclicks.filter(fn => !funcs.includes(fn))
    )];

  const score =
    calcHealthScore(
      validation,
      undefinedFns,
      dupFuncs
    );

  return {
    funcs,
    ids,
    validation,
    dupFuncs,
    undefinedFns,
    score
  };
}
