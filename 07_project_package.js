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

    if (
      typeof saveCurrentSearchEditorFile ===
      "function"
    ) {
      saveCurrentSearchEditorFile();
    }

    const zip = new JSZip();

    const timestamp =
      new Date()
        .toISOString()
        .replace(/[:.]/g, "-");

    const html =
      "<!DOCTYPE html>\n" +
      document.documentElement.outerHTML;

    const references =
      getProjectPackageReferences(html);

    const requestedFiles = [
      "index.html",
      ...references.local.map(item => item.path)
    ];

    const savedFiles = ["index.html"];
    const missingFiles = [];

    zip.file("index.html", html);

    for (const item of references.local) {

      try {

        const res = await fetch(item.fetchPath);

        if (!res.ok) {
          missingFiles.push({
            path: item.path,
            status: res.status,
            reason: "HTTP error"
          });
          continue;
        }

        const data = await res.arrayBuffer();

        zip.file(item.path, data);
        savedFiles.push(item.path);

      } catch (e) {
        missingFiles.push({
          path: item.path,
          status: 0,
          reason: e && e.message
            ? e.message
            : "Fetch failed"
        });

        console.warn(
          "package file skip:",
          item.path,
          e
        );
      }
    }

    if (missingFiles.length) {
      alert(
        "プロジェクト保存を中止しました\n\n" +
        "必須ファイルを取得できません。\n" +
        missingFiles
          .map(item => "- " + item.path)
          .join("\n")
      );

      return {
        ok: false,
        complete: false,
        requestedFiles,
        savedFiles,
        missingFiles
      };
    }

    const projectInfo = {
      project: "AIプロンプト生成Pro",
      version:
        getProjectPackageVersion(),
      savedAt:
        new Date().toISOString(),
      complete: true,
      requestedFiles,
      savedFiles: [
        ...savedFiles,
        "project_info.json"
      ],
      missingFiles: [],
      externalFiles:
        references.external,
      fileCount:
        savedFiles.length + 1
    };

    zip.file(
      "project_info.json",
      JSON.stringify(projectInfo, null, 2)
    );

    const blob = await zip.generateAsync({
      type: "blob"
    });

    const verification =
      await verifyProjectPackageBlob(
        blob,
        projectInfo.savedFiles
      );

    if (!verification.complete) {
      alert(
        "プロジェクト保存を中止しました\n\n" +
        "ZIP生成後の整合性検証に失敗しました。\n" +
        verification.missingFiles
          .map(file => "- " + file)
          .join("\n")
      );

      return {
        ok: false,
        complete: false,
        verification
      };
    }

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
      "プロジェクト保存完了\n\n" +
      "Files : " +
      projectInfo.fileCount + "\n" +
      "Missing : 0\n" +
      "Complete : true"
    );

    return {
      ok: true,
      complete: true,
      fileName: a.download,
      projectInfo
    };

  } catch (e) {

    alert(
      "保存失敗\n\n" +
      e.message
    );
  }
}

function getProjectPackageReferences(html) {

  const parser = new DOMParser();
  const doc = parser.parseFromString(
    String(html || ""),
    "text/html"
  );

  const values = [];

  doc.querySelectorAll("script[src]")
    .forEach(el => values.push(
      el.getAttribute("src")
    ));

  doc.querySelectorAll(
    'link[rel="stylesheet"][href], link[rel~="icon"][href]'
  ).forEach(el => values.push(
    el.getAttribute("href")
  ));

  doc.querySelectorAll("img[src], source[src]")
    .forEach(el => values.push(
      el.getAttribute("src")
    ));

  const localMap = new Map();
  const external = [];

  values.filter(Boolean).forEach(value => {
    const ref = String(value).trim();

    if (
      /^(?:https?:)?\/\//i.test(ref)
    ) {
      if (!external.includes(ref)) {
        external.push(ref);
      }
      return;
    }

    if (/^(?:data:|blob:|#)/i.test(ref)) {
      return;
    }

    const path = cleanProjectPackagePath(ref);

    if (
      !path ||
      path === "index.html" ||
      path.includes("../")
    ) {
      return;
    }

    if (!localMap.has(path)) {
      localMap.set(path, {
        path,
        fetchPath: ref
      });
    }
  });

  return {
    local: [...localMap.values()],
    external
  };
}

function getProjectPackageVersion() {
  return (
    window.APP_VERSION ||
    window.PROJECT_INFO?.version ||
    get("versionLabel")?.innerText ||
    "unknown"
  );
}

async function verifyProjectPackageBlob(
  blob,
  expectedFiles
) {
  const generatedZip =
    await JSZip.loadAsync(blob);

  const actualFiles = Object.keys(
    generatedZip.files
  ).filter(path =>
    !generatedZip.files[path].dir
  );

  const missingFiles =
    expectedFiles.filter(path =>
      !actualFiles.includes(path)
    );

  return {
    complete: missingFiles.length === 0,
    expectedFiles: [...expectedFiles],
    actualFiles,
    missingFiles
  };
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

/* ===============================
   Get Project Package File Candidates
=============================== */

function getProjectPackageFileCandidates() {

  const state =
    buildProjectState();

  const files = [];

  state.files.forEach(file => {

    if (!file || !file.path) {
      return;
    }

    files.push({

      path:
        cleanProjectPackagePath(
          file.path
        ),

      fetchPath:
        file.fetchPath ||
        file.path,

      type:
        getProjectFileCategory(
          file.path
        ),

      source:
        "memory"

    });

  });

  if (
    !files.some(file =>
      file.path === "project_info.json"
    )
  ) {

    files.push({
      path: "project_info.json",
      type: "json",
      source: "generated"
    });

  }

  return files;

}

async function executeSaveProjectPackage() {
  return saveProjectPackage();
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