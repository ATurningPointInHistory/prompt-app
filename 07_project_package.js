/* ===============================
   FILE: 07_project_package.js
   Project Package Builder
   Static Manifest Build v2.0.0
=============================== */

const AI_PRO_STATIC_SCRIPT_MANIFEST_SOURCE =
  "./00_script_manifest.json";

const AI_PRO_SCRIPT_BLOCK_START =
  "<!-- AI_PRO_SCRIPT_BLOCK_START -->";

const AI_PRO_SCRIPT_BLOCK_END =
  "<!-- AI_PRO_SCRIPT_BLOCK_END -->";


async function saveProjectPackage() {

  try {

    if (typeof JSZip === "undefined") {
      alert(
        "JSZipが読み込まれていません"
      );
      return;
    }

    const zipFileName =
      getProjectPackageZipName();

    if (!zipFileName) {
      return {
        ok: false,
        canceled: true
      };
    }

    if (
      typeof saveCurrentSearchEditorFile ===
      "function"
    ) {
      saveCurrentSearchEditorFile();
    }

    const zip = new JSZip();

    const cleanHtml =
      await getCleanProjectIndexHtml();

    if (!cleanHtml) {
      alert(
        "プロジェクト保存を中止しました\n\n" +
        "Clean index.htmlを取得できません。"
      );

      return {
        ok: false,
        complete: false,
        reason: "CLEAN_INDEX_UNAVAILABLE"
      };
    }

    const manifestBuild =
      await buildProjectIndexFromStaticManifest(
        cleanHtml
      );

    if (!manifestBuild.ok) {
      alert(
        "プロジェクト保存を中止しました\n\n" +
        "Script Manifest検証に失敗しました。\n" +
        manifestBuild.errors
          .map(error => "- " + error)
          .join("\n")
      );

      return {
        ok: false,
        complete: false,
        reason: "SCRIPT_MANIFEST_INVALID",
        manifestValidation:
          manifestBuild.validation,
        errors: manifestBuild.errors
      };
    }

    const html = manifestBuild.html;

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

      if (
        item.path ===
        manifestBuild.manifestPath
      ) {
        zip.file(
          item.path,
          manifestBuild.manifestText
        );
        savedFiles.push(item.path);
        continue;
      }

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

        const expectedScriptIntegrity =
          manifestBuild.manifest.hashes &&
          manifestBuild.manifest.hashes[item.path];

        if (expectedScriptIntegrity) {
          const actualHash =
            await calculateProjectPackageSHA256(data);

          if (
            actualHash !==
            expectedScriptIntegrity.sha256
          ) {
            missingFiles.push({
              path: item.path,
              status: 0,
              reason:
                "SHA-256 mismatch"
            });
            continue;
          }

          if (
            data.byteLength !==
            expectedScriptIntegrity.byteSize
          ) {
            missingFiles.push({
              path: item.path,
              status: 0,
              reason:
                "byteSize mismatch"
            });
            continue;
          }
        }

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
        "Manifest参照を含む必須ファイルを取得できません。\n" +
        missingFiles
          .map(item => "- " + item.path)
          .join("\n")
      );

      return {
        ok: false,
        complete: false,
        requestedFiles,
        savedFiles,
        missingFiles,
        manifestValidation:
          manifestBuild.validation
      };
    }

    const projectInfo = {
      manifestSchemaVersion: 1,
      manifestType: "Project Package Build Manifest",
      project: "AIプロンプト生成Pro",
      version:
        getProjectPackageVersion(),
      entryFile: "index.html",
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
      localFileCount:
        savedFiles.length + 1,
      externalFileCount:
        references.external.length,
      fileCount:
        savedFiles.length + 1,
      cleanIndex: true,
      scriptManifestSource:
        manifestBuild.manifestPath,
      scriptManifestVersion:
        manifestBuild.manifest.version,
      scriptManifestSchemaVersion:
        manifestBuild.manifest.manifestSchemaVersion,
      applicationReleaseVersion:
        manifestBuild.manifest.applicationReleaseVersion,
      versionArchitecture:
        manifestBuild.manifest.versionArchitecture,
      scriptManifestHash:
        manifestBuild.manifest.manifestHash,
      scriptSetHash:
        manifestBuild.manifest.scriptSetHash,
      scriptManifestCount:
        manifestBuild.manifest.scripts.length,
      scriptLoading: {
        mode:
          "Build-time Manifest to Static Scripts",
        runtimeLoader: false,
        documentWrite: false,
        first:
          manifestBuild.validation.first,
        last:
          manifestBuild.validation.last,
        generatedAtSave: true
      }
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

    a.download = zipFileName;

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
      "Scripts : " +
      projectInfo.scriptManifestCount + "\n" +
      "Missing : 0\n" +
      "Complete : true"
    );

    return {
      ok: true,
      complete: true,
      fileName: a.download,
      projectInfo,
      manifestValidation:
        manifestBuild.validation
    };

  } catch (e) {

    alert(
      "保存失敗\n\n" +
      e.message
    );

    return {
      ok: false,
      complete: false,
      reason: "UNEXPECTED_ERROR",
      error: e && e.message
        ? e.message
        : String(e)
    };
  }
}



function stableProjectPackageValue(value) {
  if (Array.isArray(value)) {
    return value.map(stableProjectPackageValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const output = {};

  Object.keys(value)
    .sort()
    .forEach(key => {
      output[key] = stableProjectPackageValue(value[key]);
    });

  return output;
}


function stableProjectPackageStringify(value) {
  return JSON.stringify(
    stableProjectPackageValue(value)
  );
}


async function calculateProjectPackageSHA256(input) {
  if (
    !window.crypto ||
    !window.crypto.subtle ||
    typeof TextEncoder === "undefined"
  ) {
    throw new Error(
      "SHA-256検証に必要なWeb Crypto APIが利用できません"
    );
  }

  let buffer;

  if (input instanceof ArrayBuffer) {
    buffer = input;
  } else if (ArrayBuffer.isView(input)) {
    buffer = input.buffer.slice(
      input.byteOffset,
      input.byteOffset + input.byteLength
    );
  } else {
    buffer = new TextEncoder().encode(
      String(input == null ? "" : input)
    ).buffer;
  }

  const digest = await window.crypto.subtle.digest(
    "SHA-256",
    buffer
  );

  return [...new Uint8Array(digest)]
    .map(value => value.toString(16).padStart(2, "0"))
    .join("");
}


function getStaticManifestHashPayload(manifest) {
  const value = JSON.parse(
    JSON.stringify(manifest || {})
  );

  delete value.manifestHash;
  delete value.updatedAt;

  return value;
}


function getStaticManifestScriptSetPayload(manifest) {
  const hashes =
    manifest &&
    manifest.hashes &&
    typeof manifest.hashes === "object"
      ? manifest.hashes
      : {};

  return (
    manifest && Array.isArray(manifest.scripts)
      ? manifest.scripts
      : []
  ).map(src => {
    const path = normalizeStaticScriptPath(src);
    const item = hashes[path] || {};

    return path + ":" + String(item.sha256 || "");
  }).join("\n");
}


function getStaticScriptHashQuery(src) {
  try {
    const url = new URL(
      String(src || ""),
      document.baseURI
    );

    return url.searchParams.get("h") || "";
  } catch (_) {
    const match = String(src || "")
      .match(/[?&]h=([a-f0-9]+)/i);

    return match ? match[1] : "";
  }
}


async function validateStaticScriptManifestIntegrity(manifest) {
  const errors = [];

  if (!manifest || typeof manifest !== "object") {
    return {
      ok: false,
      errors: ["Manifestがありません"]
    };
  }

  const scripts = Array.isArray(manifest.scripts)
    ? manifest.scripts
    : [];

  const hashes =
    manifest.hashes && typeof manifest.hashes === "object"
      ? manifest.hashes
      : {};

  scripts.forEach(src => {
    const path = normalizeStaticScriptPath(src);
    const item = hashes[path];

    if (!item) {
      errors.push(
        "Script Hash情報がありません: " + path
      );
      return;
    }

    if (!/^[a-f0-9]{64}$/.test(String(item.sha256 || ""))) {
      errors.push(
        "Script SHA-256形式が不正です: " + path
      );
    }

    if (
      !Number.isInteger(item.byteSize) ||
      item.byteSize < 0
    ) {
      errors.push(
        "Script byteSizeが不正です: " + path
      );
    }

    const expectedCacheKey =
      String(item.sha256 || "").slice(0, 12);

    if (item.cacheKey !== expectedCacheKey) {
      errors.push(
        "Script cacheKeyがSHA-256と一致しません: " + path
      );
    }

    if (getStaticScriptHashQuery(src) !== item.cacheKey) {
      errors.push(
        "Script URLのHashがManifestと一致しません: " + path
      );
    }
  });

  if (!errors.length) {
    const scriptSetHash =
      await calculateProjectPackageSHA256(
        getStaticManifestScriptSetPayload(manifest)
      );

    if (manifest.scriptSetHash !== scriptSetHash) {
      errors.push(
        "Script Set Hashが一致しません"
      );
    }

    const manifestHash =
      await calculateProjectPackageSHA256(
        stableProjectPackageStringify(
          getStaticManifestHashPayload(manifest)
        )
      );

    if (manifest.manifestHash !== manifestHash) {
      errors.push(
        "Manifest Hashが一致しません"
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    scriptSetHash:
      manifest.scriptSetHash || "",
    manifestHash:
      manifest.manifestHash || ""
  };
}


function normalizeStaticScriptPath(src) {
  return String(src || "")
    .trim()
    .split("#")[0]
    .split("?")[0]
    .replace(/^\.\//, "");
}


function validateStaticScriptManifest(manifest) {

  const errors = [];

  if (
    !manifest ||
    typeof manifest !== "object" ||
    Array.isArray(manifest)
  ) {
    errors.push(
      "ManifestはJSONオブジェクトである必要があります"
    );
  }

  const version =
    manifest && typeof manifest.version === "string"
      ? manifest.version.trim()
      : "";

  if (!version) {
    errors.push(
      "Manifest versionがありません"
    );
  }

  if (
    !manifest ||
    manifest.manifestSchemaVersion !== "2.0.0"
  ) {
    errors.push(
      "Manifest Schema Version 2.0.0が必要です"
    );
  }

  if (
    !manifest ||
    manifest.versionArchitecture !== "independent-version-v1"
  ) {
    errors.push(
      "Version Architectureがindependent-version-v1ではありません"
    );
  }

  if (
    !manifest ||
    manifest.hashAlgorithm !== "SHA-256"
  ) {
    errors.push(
      "Manifest Hash AlgorithmはSHA-256が必要です"
    );
  }

  const scripts =
    manifest && Array.isArray(manifest.scripts)
      ? manifest.scripts
      : [];

  if (!scripts.length) {
    errors.push(
      "Manifest scriptsが空です"
    );
  }

  const invalidItems = scripts.filter(src =>
    typeof src !== "string" ||
    !src.trim()
  );

  if (invalidItems.length) {
    errors.push(
      "Manifestに空または文字列以外の項目があります"
    );
  }

  const normalized = scripts
    .filter(src => typeof src === "string")
    .map(normalizeStaticScriptPath);

  const invalidPaths = scripts.filter(src => {
    if (typeof src !== "string") {
      return true;
    }

    const value = src.trim();
    const path = normalizeStaticScriptPath(value);

    return Boolean(
      !value ||
      /^(?:https?:)?\/\//i.test(value) ||
      /^(?:data:|blob:|#)/i.test(value) ||
      value.startsWith("/") ||
      value.includes("../") ||
      value.includes("\\") ||
      !/\.js$/i.test(path)
    );
  });

  if (invalidPaths.length) {
    errors.push(
      "ManifestにはProject内の相対JSだけを登録してください: " +
      invalidPaths.map(String).join(", ")
    );
  }

  const duplicates = normalized.filter(
    (path, index) =>
      normalized.indexOf(path) !== index
  );

  if (duplicates.length) {
    errors.push(
      "Manifestに重複があります: " +
      [...new Set(duplicates)].join(", ")
    );
  }

  const first = normalized[0] || "";
  const last =
    normalized[normalized.length - 1] || "";

  if (first !== "00_core.js") {
    errors.push(
      "00_core.jsがManifestの先頭ではありません"
    );
  }

  if (last !== "99_init.js") {
    errors.push(
      "99_init.jsがManifestの最後ではありません"
    );
  }

  const forbidden = [
    "00_script_loader.js",
    "00_script_manifest.js"
  ].filter(path => normalized.includes(path));

  if (forbidden.length) {
    errors.push(
      "実行時LoaderをManifestへ登録できません: " +
      forbidden.join(", ")
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    version: version || "unknown",
    manifestSchemaVersion:
      manifest && manifest.manifestSchemaVersion || "unknown",
    applicationReleaseVersion:
      manifest && manifest.applicationReleaseVersion || version || "unknown",
    versionArchitecture:
      manifest && manifest.versionArchitecture || "unknown",
    scriptCount: scripts.length,
    first,
    last,
    normalizedScripts: normalized
  };
}


function escapeStaticScriptAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}


function buildStaticScriptBlock(manifest) {
  return manifest.scripts
    .map(src =>
      '<script src="' +
      escapeStaticScriptAttribute(src) +
      '"></script>'
    )
    .join("\n");
}


function countProjectPackageToken(source, token) {
  if (!token) {
    return 0;
  }

  return String(source || "")
    .split(token)
    .length - 1;
}


function replaceStaticScriptBlock(
  html,
  scriptBlock
) {
  const source = String(html || "");

  const startCount =
    countProjectPackageToken(
      source,
      AI_PRO_SCRIPT_BLOCK_START
    );

  const endCount =
    countProjectPackageToken(
      source,
      AI_PRO_SCRIPT_BLOCK_END
    );

  if (startCount !== 1 || endCount !== 1) {
    throw new Error(
      "index.htmlのScript Blockマーカーは開始・終了各1個が必要です"
    );
  }

  const startIndex = source.indexOf(
    AI_PRO_SCRIPT_BLOCK_START
  );

  const endIndex = source.indexOf(
    AI_PRO_SCRIPT_BLOCK_END
  );

  if (
    startIndex < 0 ||
    endIndex < 0 ||
    endIndex <= startIndex
  ) {
    throw new Error(
      "index.htmlのScript Blockマーカー順序が不正です"
    );
  }

  return (
    source.slice(
      0,
      startIndex +
      AI_PRO_SCRIPT_BLOCK_START.length
    ) +
    "\n" +
    scriptBlock +
    "\n" +
    source.slice(endIndex)
  );
}


function validateGeneratedStaticScriptIndex(
  html,
  manifest
) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    String(html || ""),
    "text/html"
  );

  const actualScripts = [
    ...doc.querySelectorAll("script[src]")
  ]
    .map(el => String(
      el.getAttribute("src") || ""
    ).trim())
    .filter(src =>
      src &&
      !/^(?:https?:)?\/\//i.test(src)
    );

  const expectedScripts =
    manifest.scripts.map(src => String(src).trim());

  const errors = [];

  if (
    countProjectPackageToken(
      html,
      AI_PRO_SCRIPT_BLOCK_START
    ) !== 1 ||
    countProjectPackageToken(
      html,
      AI_PRO_SCRIPT_BLOCK_END
    ) !== 1
  ) {
    errors.push(
      "生成後index.htmlのScript Blockマーカーが不正です"
    );
  }

  if (
    actualScripts.length !==
    expectedScripts.length
  ) {
    errors.push(
      "生成後Script数がManifestと一致しません"
    );
  }

  const mismatchIndex = expectedScripts.findIndex(
    (src, index) =>
      actualScripts[index] !== src
  );

  if (mismatchIndex >= 0) {
    errors.push(
      "生成後Script順序がManifestと一致しません: index " +
      mismatchIndex
    );
  }

  if (
    actualScripts.some(src =>
      normalizeStaticScriptPath(src) ===
      "00_script_loader.js"
    )
  ) {
    errors.push(
      "生成後index.htmlに実行時Loaderが含まれています"
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    actualScriptCount: actualScripts.length,
    expectedScriptCount:
      expectedScripts.length,
    mismatchIndex
  };
}


async function loadStaticScriptManifest() {
  try {
    const manifestUrl = new URL(
      AI_PRO_STATIC_SCRIPT_MANIFEST_SOURCE,
      document.baseURI
    );

    const response = await fetch(
      manifestUrl.href,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(
        "00_script_manifest.json fetch failed: " +
        response.status
      );
    }

    const manifestText =
      await response.text();

    let manifest;

    try {
      manifest = JSON.parse(manifestText);
    } catch (error) {
      throw new Error(
        "00_script_manifest.jsonのJSON形式が不正です: " +
        error.message
      );
    }

    const structureValidation =
      validateStaticScriptManifest(manifest);

    const integrityValidation =
      structureValidation.ok
        ? await validateStaticScriptManifestIntegrity(manifest)
        : {
            ok: false,
            errors: []
          };

    const validation = {
      ...structureValidation,
      integrity: integrityValidation,
      ok:
        structureValidation.ok &&
        integrityValidation.ok,
      errors: [
        ...structureValidation.errors,
        ...integrityValidation.errors
      ]
    };

    return {
      ok: validation.ok,
      errors: validation.errors,
      manifest,
      manifestText,
      manifestPath:
        cleanProjectPackagePath(
          AI_PRO_STATIC_SCRIPT_MANIFEST_SOURCE
        ),
      validation
    };

  } catch (error) {
    return {
      ok: false,
      errors: [
        error && error.message
          ? error.message
          : String(error)
      ],
      manifest: null,
      manifestText: "",
      manifestPath:
        cleanProjectPackagePath(
          AI_PRO_STATIC_SCRIPT_MANIFEST_SOURCE
        ),
      validation: {
        ok: false,
        errors: [
          error && error.message
            ? error.message
            : String(error)
        ],
        version: "unknown",
        scriptCount: 0,
        first: "",
        last: "",
        normalizedScripts: []
      }
    };
  }
}


async function buildProjectIndexFromStaticManifest(
  cleanHtml
) {
  const loaded =
    await loadStaticScriptManifest();

  if (!loaded.ok) {
    return loaded;
  }

  try {
    const scriptBlock =
      buildStaticScriptBlock(
        loaded.manifest
      );

    const html =
      replaceStaticScriptBlock(
        cleanHtml,
        scriptBlock
      );

    const generatedValidation =
      validateGeneratedStaticScriptIndex(
        html,
        loaded.manifest
      );

    if (!generatedValidation.ok) {
      return {
        ...loaded,
        ok: false,
        errors:
          generatedValidation.errors,
        generatedValidation
      };
    }

    return {
      ...loaded,
      ok: true,
      html,
      generatedValidation
    };

  } catch (error) {
    return {
      ...loaded,
      ok: false,
      errors: [
        error && error.message
          ? error.message
          : String(error)
      ]
    };
  }
}

function validateCleanProjectIndexHtml(html) {

  const source =
    String(html || "");

  if (!source.trim()) {
    return false;
  }

  const markerReady = Boolean(
    countProjectPackageToken(
      source,
      AI_PRO_SCRIPT_BLOCK_START
    ) === 1 &&
    countProjectPackageToken(
      source,
      AI_PRO_SCRIPT_BLOCK_END
    ) === 1 &&
    source.indexOf(AI_PRO_SCRIPT_BLOCK_START) <
      source.indexOf(AI_PRO_SCRIPT_BLOCK_END)
  );

  const parser = new DOMParser();
  const doc = parser.parseFromString(
    source,
    "text/html"
  );

  const localScripts = [
    ...doc.querySelectorAll("script[src]")
  ]
    .map(el =>
      cleanProjectPackagePath(
        el.getAttribute("src")
      )
    )
    .filter(path =>
      path &&
      !/^(?:https?:)?\/\//i.test(path)
    );

  const staticBootstrap = Boolean(
    localScripts[0] === "00_core.js" &&
    localScripts[localScripts.length - 1] ===
      "99_init.js" &&
    !localScripts.includes(
      "00_script_loader.js"
    )
  );

  const runtimeOnly = [
    "repairSearchQuickPanel",
    "repairQuickFavoritePanel",
    "repairQuickFavoriteToggle"
  ].some(id => doc.getElementById(id));

  const dirtyContainerIds = [
    "commandBox",
    "presetBox",
    "templateList",
    "dangerList",
    "patternList",
    "history",
    "floatPanel"
  ];

  const dirtyContainer =
    dirtyContainerIds.some(id => {
      const element = doc.getElementById(id);

      return Boolean(
        element &&
        element.children.length > 0
      );
    });

  return Boolean(
    markerReady &&
    staticBootstrap &&
    !runtimeOnly &&
    !dirtyContainer
  );
}

async function getCleanProjectIndexHtml() {

  const cached =
    window.AI_PRO_CLEAN_INDEX_HTML;

  if (validateCleanProjectIndexHtml(cached)) {
    return cached;
  }

  try {
    const indexUrl = new URL(
      "./index.html",
      document.baseURI
    );

    indexUrl.searchParams.set(
      "packageSource",
      Date.now()
    );

    const response = await fetch(
      indexUrl.href,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(
        "index.html fetch failed: " +
        response.status
      );
    }

    const source =
      await response.text();

    if (!validateCleanProjectIndexHtml(source)) {
      throw new Error(
        "Fetched index.html is not clean"
      );
    }

    return source;

  } catch (error) {
    console.error(
      "Clean index.html unavailable",
      error
    );

    return null;
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

  values.push(
    AI_PRO_STATIC_SCRIPT_MANIFEST_SOURCE
  );

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

  const timestamp =
    new Date()
      .toISOString()
      .replace(/[:.]/g, "-");

  const defaultName =
    `AIPro_Project_${timestamp}`;

  if (!name) {

    const enteredName = prompt(
      "保存するZIPファイル名を入力してください",
      defaultName
    );

    if (enteredName === null) {
      return null;
    }

    name = enteredName.trim();

  }

  if (!name) {
    name = defaultName;
  }

  name =
    name.replace(/[\\/:*?"<>|]/g, "_");

  if (!/\.zip$/i.test(name)) {
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