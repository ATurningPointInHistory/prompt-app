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
        .replace(/[:.]/g, "-");

    const html =
      "<!DOCTYPE html>\n" +
      document.documentElement.outerHTML;

    zip.file(
      "index.html",
      html
    );

    const files =
      typeof getExternalScriptSrcList === "function"
        ? getExternalScriptSrcList(html)
            .filter(src =>
              !/^https?:\/\//i.test(src)
            )
            .map(src =>
              src
                .replace(/^\.\//, "")
                .split("?")[0]
            )
        : [];

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

      } catch (e) {
        console.warn(
          "package file skip:",
          file,
          e
        );
      }
    }

    zip.file(
      "project_info.json",
      JSON.stringify(
        {
          project:
            "AIプロンプト生成Pro",

          version:
            get("versionLabel")
              ?.innerText ||
            "unknown",

          savedAt:
            new Date()
              .toISOString(),

          files,

          fileCount:
            files.length
        },
        null,
        2
      )
    );

    const blob =
      await zip.generateAsync({
        type: "blob"
      });

    const a =
      document.createElement("a");

    a.href =
      URL.createObjectURL(blob);

    a.download =
      `AIPro_Project_${timestamp}.zip`;

    a.click();

    setTimeout(() => {
      URL.revokeObjectURL(
        a.href
      );
    }, 1000);

    alert(
      "プロジェクト保存完了"
    );

  } catch (e) {

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

/* ===============================
   Project Package Manager
=============================== */

let projectPackageFiles = [];

function showProjectPackageManager() {

  projectPackageFiles =
    getProjectPackageFileCandidates();

  const panel =
    get("floatPanel");

  if (!panel) {
    alert("floatPanel がありません");
    return;
  }

  panel.style.display = "block";
  panel.innerHTML =
    buildProjectPackageManagerHtml();

}

function buildProjectPackageManagerHtml() {

  const rows =
    projectPackageFiles.map(file => `
<div class="project-package-row">
  <input
    type="checkbox"
    class="project-package-check"
    value="${escapeHtml(file.path)}"
    checked
    onchange="updateProjectPackageReport()"
  >
  <div class="project-package-name">
    ${escapeHtml(file.path)}
  </div>
  <div class="project-package-type">
    ${escapeHtml(file.type)}
  </div>
</div>
`).join("");

  return `
<div class="float-panel-header">
  <div class="float-panel-title">📦 Project Package</div>
  <button onclick="closeFloatPanel()">×</button>
</div>

<label>ZIP保存名</label>
<input
  id="projectPackageName"
  placeholder="AIPro_v6.0_backup"
  oninput="updateProjectPackageReport()"
>

<div class="project-package-actions">
  <button onclick="selectAllProjectPackageFiles(true)">全選択</button>
  <button onclick="selectAllProjectPackageFiles(false)">全解除</button>
</div>

<div style="margin-top:8px;">
  ${rows}
</div>

<pre
  id="projectPackageReport"
  class="project-package-report"
></pre>

<button
  class="float-list-btn"
  onclick="executeSaveProjectPackage()"
>
📦 ZIP保存
</button>
`;

}

function updateProjectPackageReport() {

  const selected =
    getSelectedProjectPackageFiles();

  const skipped =
    projectPackageFiles.length -
    selected.length;

  const report =
`Project Package

Files : ${projectPackageFiles.length}
Selected : ${selected.length}
Skipped : ${skipped}
Missing : 0
Package Size : before save`;

  const box =
    get("projectPackageReport");

  if (box) {
    box.textContent = report;
  }

}

function selectAllProjectPackageFiles(flag) {

  document
    .querySelectorAll(".project-package-check")
    .forEach(check => {
      check.checked = flag;
    });

  updateProjectPackageReport();

}

function getSelectedProjectPackageFiles() {

  return [
    ...document.querySelectorAll(
      ".project-package-check:checked"
    )
  ].map(el => el.value);

}

function getProjectPackageFileCandidates() {

  const files = [];

  files.push({
    path: "index.html",
    type: "html",
    source: "document"
  });

  document
    .querySelectorAll("script[src]")
    .forEach(script => {

      const src =
        script.getAttribute("src");

      if (!src) {
        return;
      }

      files.push({
        path: cleanProjectPackagePath(src),
        fetchPath: src,
        type: "js",
        source: "fetch"
      });

    });

  document
    .querySelectorAll("link[rel='stylesheet'][href]")
    .forEach(link => {

      const href =
        link.getAttribute("href");

      if (!href) {
        return;
      }

      files.push({
        path: cleanProjectPackagePath(href),
        fetchPath: href,
        type: "css",
        source: "fetch"
      });

    });

  files.push({
    path: "project_info.json",
    type: "json",
    source: "generated"
  });

  return files;

}

async function executeSaveProjectPackage() {

  try {

    if (typeof JSZip === "undefined") {
      alert("JSZip が読み込まれていません");
      return;
    }

    if (
      typeof getProjectPackageFileText !==
      "function"
    ) {
      alert(
        "getProjectPackageFileText が見つかりません\n\n" +
        "01_project_config.js の読み込み順を確認してください"
      );
      return;
    }

    saveCurrentSearchEditorFile();

    const zip =
      new JSZip();

    const selectedPaths =
      getSelectedProjectPackageFiles();

    let missing = 0;

    for (const file of projectPackageFiles) {

      if (
        !selectedPaths.includes(
          file.path
        )
      ) {
        continue;
      }

      try {

        const zipPath =
          getProjectPackageZipPath(
            file
          );

        const result =
          await getProjectPackageFileText(
            file
          );

        if (
          !result ||
          !result.ok
        ) {

          missing++;

          continue;

        }

        zip.file(
          zipPath,
          result.text
        );

      } catch (e) {

        missing++;

        console.warn(
          "Package file failed:",
          file.path,
          e
        );

      }

    }

    const blob =
      await zip.generateAsync({
        type: "blob"
      });

    const fileName =
      getProjectPackageZipName();

    downloadProjectPackageBlob(
      blob,
      fileName
    );

    alert(
      `Project Package 保存完了\n\n` +
      `Selected : ${selectedPaths.length}\n` +
      `Missing : ${missing}\n` +
      `Size : ${Math.round(blob.size / 1024)}KB`
    );

  } catch (e) {

    alert(
      "Project Package 保存に失敗しました\n\n" +
      e.message
    );

  }

}

function getProjectPackageZipName() {

  const input =
    get("projectPackageName");

  let name =
    input && input.value.trim()
      ? input.value.trim()
      : "";

  if (!name) {

    const timestamp =
      new Date()
        .toISOString()
        .replace(/[:.]/g, "-");

    name =
      `AIPro_Project_${timestamp}`;

  }

  name =
    name.replace(/[\\/:*?"<>|]/g, "_");

  if (!name.endsWith(".zip")) {
    name += ".zip";
  }

  return name;

}

function getProjectPackageZipPath(file) {

  const name =
    cleanProjectPackagePath(file.path);

  switch (file.type) {

    case "html":
      return "html/" + name;

    case "js":
      return "js/" + name;

    case "css":
      return "css/" + name;

    case "json":
      return "data/" + name;

    default:
      return "other/" + name;

  }

}

function cleanProjectPackagePath(path) {

  return String(path || "")
    .split("?")[0]
    .replace(/^\.?\//, "");

}

function buildProjectPackageInfo() {

  return {
    app: "AIプロンプト生成Pro",
    version: "v6.0",
    createdAt: new Date().toISOString(),
    files: projectPackageFiles.map(file => ({
      path: file.path,
      type: file.type,
      source: file.source
    }))
  };

}

function downloadProjectPackageBlob(
  blob,
  fileName
) {

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href =
    url;

  a.download =
    fileName;

  a.style.display =
    "none";

  document.body.appendChild(a);

  setTimeout(() => {

    a.click();

    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 1000);

  }, 100);

}