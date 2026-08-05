/* ===============================
   FILE: 00_script_loader.js
   Sequential Classic Script Loader
   Version: 1.0.0
=============================== */

(function () {
  "use strict";

  const MANIFEST_SOURCE =
    "./00_script_manifest.js";

  let started = false;

  const status = {
    id: "AI-PRO-SCRIPT-LOAD-STATUS",
    version: "1.0.0",
    manifestSource: MANIFEST_SOURCE,
    manifestVersion: "Not Loaded",
    status: "Loading Manifest",
    ready: false,
    total: 0,
    loaded: 0,
    failed: 0,
    loadedFiles: [],
    failedFiles: [],
    startedAt: new Date().toISOString(),
    completedAt: null
  };

  window.AI_PRO_SCRIPT_MANIFEST_SOURCE =
    MANIFEST_SOURCE;

  window.AI_PRO_SCRIPT_LOAD_STATUS =
    status;

  /*
    Capture the untouched static index before
    Manifest and application scripts mutate DOM.
  */
  window.AI_PRO_CLEAN_INDEX_HTML =
    "<!DOCTYPE html>\n" +
    document.documentElement.outerHTML;

  function normalizePath(src) {
    return String(src || "")
      .split("?")[0]
      .replace(/^\.\//, "");
  }

  function validateManifest(manifest) {
    if (
      !Array.isArray(manifest) ||
      manifest.length === 0
    ) {
      throw new Error(
        "Script Manifestがありません"
      );
    }

    const invalid = manifest.filter(src =>
      typeof src !== "string" ||
      !src.trim()
    );

    if (invalid.length) {
      throw new Error(
        "Script Manifestに無効な項目があります"
      );
    }

    const normalized =
      manifest.map(normalizePath);

    const duplicates = normalized.filter(
      (path, index) =>
        normalized.indexOf(path) !== index
    );

    if (duplicates.length) {
      throw new Error(
        "Script Manifestに重複があります: " +
        [...new Set(duplicates)].join(", ")
      );
    }

    if (normalized[0] !== "00_core.js") {
      throw new Error(
        "00_core.jsがManifestの先頭ではありません"
      );
    }

    if (
      normalized[normalized.length - 1] !==
      "99_init.js"
    ) {
      throw new Error(
        "99_init.jsがManifestの最後ではありません"
      );
    }

    if (
      normalized.includes("00_script_manifest.js") ||
      normalized.includes("00_script_loader.js")
    ) {
      throw new Error(
        "Loader自身をManifestへ登録できません"
      );
    }
  }

  function escapeAttribute(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function blockLoader(error) {
    const message =
      error && error.message
        ? error.message
        : String(error || "Unknown loader error");

    status.status = "Blocked";
    status.ready = false;
    status.failed += 1;
    status.failedFiles.push(message);
    status.completedAt =
      new Date().toISOString();

    console.error(
      "[AI Prompt OS] Loader Blocked:",
      error
    );

    if (!status.alerted) {
      status.alerted = true;
      alert(
        "起動中にエラーが発生しました\n\n" +
        message
      );
    }
  }

  window.getAIProScriptLoadStatus =
    function () {
      return JSON.parse(
        JSON.stringify(status)
      );
    };

  window.__aiProScriptLoaded =
    function (src) {
      status.loaded += 1;
      status.loadedFiles.push(src);

      if (
        status.loaded + status.failed ===
        status.total
      ) {
        status.ready = status.failed === 0;
        status.status = status.ready
          ? "Ready"
          : "Blocked";
        status.completedAt =
          new Date().toISOString();

        console.log(
          "[AI Prompt OS] Script Load:",
          status.loaded + "/" + status.total,
          status.status
        );
      }
    };

  window.__aiProScriptFailed =
    function (src) {
      status.failed += 1;
      status.failedFiles.push(src);
      status.ready = false;
      status.status = "Blocked";

      console.error(
        "[AI Prompt OS] Script Load Failed:",
        src
      );

      if (!status.alerted) {
        status.alerted = true;
        alert(
          "起動中にScript読込エラーが発生しました\n\n" +
          src +
          "\n\nLoaded: " +
          status.loaded +
          "/" +
          status.total
        );
      }
    };

  window.__aiProManifestFailed =
    function (src) {
      blockLoader(
        new Error(
          "Script Manifestを読み込めません: " +
          src
        )
      );
    };

  window.__aiProStartFromManifest =
    function () {
      if (started) {
        return;
      }

      started = true;

      try {
        const manifest =
          window.AI_PRO_SCRIPT_MANIFEST;

        validateManifest(manifest);

        status.manifestVersion =
          window.AI_PRO_SCRIPT_MANIFEST_VERSION ||
          "unknown";
        status.status = "Loading Scripts";
        status.total = manifest.length;

        manifest.forEach(src => {
          const safeSrc =
            escapeAttribute(src);

          document.write(
            "<script data-ai-pro-loader=\"true\" " +
            "src=\"" + safeSrc + "\" " +
            "onload=\"window.__aiProScriptLoaded(this.src)\" " +
            "onerror=\"window.__aiProScriptFailed(this.src)\">" +
            "<\\/script>"
          );
        });

      } catch (error) {
        blockLoader(error);
      }
    };

  try {
    const manifestUrl =
      MANIFEST_SOURCE +
      "?loaderTime=" +
      Date.now();

    document.write(
      "<script data-ai-pro-manifest=\"true\" " +
      "src=\"" +
      escapeAttribute(manifestUrl) +
      "\" " +
      "onerror=\"window.__aiProManifestFailed(this.src)\">" +
      "<\\/script>"
    );

  } catch (error) {
    blockLoader(error);
  }

})();
