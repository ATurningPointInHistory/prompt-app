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
