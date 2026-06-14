/* ===============================
   FILE: 07_project_package.js
   Project Package Builder
=============================== */


async function saveProjectPackage() {

  try {

    if (typeof JSZip === "undefined") {

      alert(
        "JSZipが読み込まれていません"
      );

      return;
    }

    const zip =
      new JSZip();

    const timestamp =
      new Date()
        .toISOString()
        .replace(/[:.]/g,"-");

    // index.html

    const html =

      "<!DOCTYPE html>\n" +

      document.documentElement
        .outerHTML;

    zip.file(
      "index.html",
      html
    );

    // 分割JS

    const files = [
      "00_bootstrap.js",
      "01_core.js",
      "02_prompt.js",
      "03_data.js",
      "04_tools.js",
      "05_repair.js",
      "06_search.js",
      "07_health_dependency.js",
      "07_health_diagnose.js",
      "07_health_unused.js",
      "07_backup_health.js",
      "08_function_relation.js",
      "08_ai_analyzer.js",
      "08_ai_apply.js",
      "08_ai_test.js",
      "08_ai_integrator.js",
      "09_ai_instruction.js",
      "99_init.js"
    ];

    for (const file of files) {

      try {

        const res =
          await fetch(file);

        if (!res.ok) {
          continue;
        }

        const text =
          await res.text();

        zip.file(
          file,
          text
        );

      } catch {}

    }

    // 情報

    zip.file(

      "project_info.json",

      JSON.stringify({

        project:
          "AIプロンプト生成Pro",

        version:
          get("versionLabel")
            ?.innerText ||

          "unknown",

        savedAt:
          new Date()
            .toISOString(),

        functionCount:
          (
            document.body.innerHTML
              .match(
                /function\s+[a-zA-Z0-9_$]+\s*\(/g
              ) || []
          ).length

      },

      null,

      2)

    );

    const blob =
      await zip.generateAsync({

        type:"blob"

      });

    const a =
      document.createElement("a");

    a.href =
      URL.createObjectURL(blob);

    a.download =

      `AIPro_Project_${timestamp}.zip`;

    a.click();

    setTimeout(()=>{

      URL.revokeObjectURL(
        a.href
      );

    },1000);

    alert(
      "プロジェクト保存完了"
    );

  } catch(e) {

    alert(

      "保存失敗\n\n" +

      e.message

    );

  }

}

function analyzeProjectJsDependency() {

  const input =
    document.createElement("input");

  input.type = "file";
  input.accept = ".html,.htm,text/html";

  input.onchange = (event) => {

    const file =
      event.target.files &&
      event.target.files[0];

    if (!file) return;

    const reader =
      new FileReader();

    reader.onload = () => {

      const html =
        String(reader.result || "");

      const scripts =
        [...html.matchAll(
          /<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi
        )]
        .map(match => match[1]);

      const localScripts =
        scripts.filter(src =>
          !/^https?:\/\//i.test(src)
        );

      const cdnScripts =
        scripts.filter(src =>
          /^https?:\/\//i.test(src)
        );

      const result =
        "Project JS Health\n\n" +
        "=== Source ===\n" +
        file.name +
        "\n\n" +

        "=== Local JS Files ===\n" +
        (
          localScripts.length
            ? localScripts.join("\n")
            : "none"
        ) +
        "\n\n" +

        "=== CDN / External JS ===\n" +
        (
          cdnScripts.length
            ? cdnScripts.join("\n")
            : "none"
        ) +
        "\n\n" +

        "=== Summary ===\n" +
        "local scripts: " + localScripts.length + "\n" +
        "external scripts: " + cdnScripts.length;

      window.latestProjectJsHealth =
        result;

      openFloatPanel(
        "Project JS Health",
        `
<div class="float-panel-actions">
  <button onclick="copyProjectJsHealth()">
    📋 コピー
  </button>
</div>

<pre class="code-preview">
${escapeHtml(result)}
</pre>
`
      );
    };

    reader.readAsText(
      file,
      "UTF-8"
    );
  };

  input.click();
}

function copyProjectJsHealth() {

  const text =
    window.latestProjectJsHealth || "";

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
      .then(() => alert("コピー完了"))
      .catch(() => {
        const ok = copyTextFallback(text);
        alert(ok ? "コピー完了" : "コピー失敗");
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