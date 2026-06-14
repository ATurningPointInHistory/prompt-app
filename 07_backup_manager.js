/* ===============================
   FILE: 07_backup_manager.js
   Backup Manager
=============================== */

async function getCleanProgramHtml() {
  const clone =
    document.documentElement.cloneNode(true);

  const floatPanel =
    clone.querySelector("#floatPanel");

  if (floatPanel) {
    floatPanel.innerHTML = "";
    floatPanel.removeAttribute("style");
    floatPanel.style.display = "none";
    floatPanel.style.left = "";
    floatPanel.style.top = "";
    floatPanel.style.right = "18px";
    floatPanel.style.bottom = "88px";
  }

  const toolsBtn =
    clone.querySelector("#toolsBtn");

  if (toolsBtn) {
    toolsBtn.innerText = "⚙";
  }

  [
    "debugBox",
    "diagnoseBox",
    "warningBox",
    "repairPreview"
  ].forEach(id => {
    const el =
      clone.querySelector("#" + id);

    if (el) {
      el.innerHTML = "";
      el.innerText = "";
      el.style.display = "none";
    }
  });

  [
    "template-manager",
    "danger-manager",
    "pattern-manager",
    "ai-preset-manager"
  ].forEach(id => {
    const el =
      clone.querySelector("#" + id);

    if (el) {
      el.style.display = "none";
    }
  });

  const output =
    clone.querySelector("#output");

  if (output) {
    output.innerText = "ここに表示";
  }

  const lineNumbers =
    clone.querySelector("#lineNumbers");

  if (lineNumbers) {
    lineNumbers.innerHTML = "1";
  }

  const cursorStatus =
    clone.querySelector("#cursorStatus");

  if (cursorStatus) {
    cursorStatus.innerText = "Ln 1 / Col 1";
  }

  const repairEditor =
    clone.querySelector("#repairEditor");

  if (repairEditor) {
    repairEditor.value = "";
    repairEditor.innerHTML = "";
  }

  [
    "commandBox",
    "presetBox",
    "templateList",
    "dangerList",
    "patternList",
    "history"
  ].forEach(id => {
    const el =
      clone.querySelector("#" + id);

    if (el) {
      el.innerHTML = "";
    }
  });

  const html =
    "<!DOCTYPE html>\n" +
    clone.outerHTML;

  const externalJs =
    await collectExternalScriptText(html);

  const htmlWithoutExternalScripts =
    html.replace(
      /<script\b[^>]*\bsrc=["'][^"']+["'][^>]*>\s*<\/script>\s*/gi,
      ""
    );

  const mergedHtml =
    externalJs.trim()
      ? htmlWithoutExternalScripts.replace(
          /<\/body>/i,
          `
<script>
${externalJs.replace(/<\/script>/gi, "<\\/script>")}
</script>
</body>`
        )
      : htmlWithoutExternalScripts;

  return mergedHtml;
}

function validateBackupHtml(html) {
  const source =
    String(html || "");

  const currentName =
    String(
      typeof currentRepairFile !== "undefined"
        ? currentRepairFile
        : ""
    ).toLowerCase();

  const isHtml =
    looksLikeHtml(source) &&
    !currentName.endsWith(".js");

  if (!isHtml) {
    let jsOk = true;
    let jsError = "";
    let lineMatch = null;

    try {
      new Function(source);
    } catch (e) {
      jsOk = false;

      const stack =
        String(e.stack || "");

      lineMatch =
        stack.match(/<anonymous>:(\d+):(\d+)/);

      jsError =
        e.message +
        "\nstack:\n" +
        stack +
        (
          lineMatch
            ? "\nline: " + lineMatch[1] +
              "\ncolumn: " + lineMatch[2]
            : ""
        );
    }

    return {
      div_ok: true,
      div_open: 0,
      div_close: 0,
      duplicate_ids: [],
      js_ok: jsOk,
      js_error: jsError,
      error_line:
        lineMatch
          ? Number(lineMatch[1])
          : null,
      error_column:
        lineMatch
          ? Number(lineMatch[2])
          : null
    };
  }

  const cleanHtml = source
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");

  const divOpen =
    (cleanHtml.match(/<div\b/gi) || []).length;

  const divClose =
    (cleanHtml.match(/<\/div>/gi) || []).length;

  const parser =
    new DOMParser();

  const doc =
    parser.parseFromString(
      source,
      "text/html"
    );

  const ids =
    [...doc.querySelectorAll("[id]")]
      .map(el => el.id)
      .filter(Boolean);

  const duplicateIds =
    [...new Set(
      ids.filter((id, i) => ids.indexOf(id) !== i)
    )];

  let jsOk = true;
  let jsError = "";
  let errorLine = null;
  let errorColumn = null;

  try {
    const scripts =
      [...doc.querySelectorAll("script")];

    scripts.forEach(s => {
      if (s.src) return;
      new Function(s.textContent);
    });
  } catch (e) {
    jsOk = false;
    jsError = e.message;

    const stack =
      String(e.stack || "");

    const match =
      stack.match(/<anonymous>:(\d+):(\d+)/);

    if (match) {
      errorLine =
        Number(match[1]);

      errorColumn =
        Number(match[2]);
    }
  }

  return {
    div_ok: divOpen === divClose,
    div_open: divOpen,
    div_close: divClose,
    duplicate_ids: duplicateIds,
    js_ok: jsOk,
    js_error: jsError,
    error_line: errorLine,
    error_column: errorColumn
  };
}

function preSaveCheck(html) {

  let source = html;

  if (!source) {
    source =
      isRepairMode() &&
      get("repairEditor") &&
      get("repairEditor").value.trim()
        ? get("repairEditor").value
        : "<!DOCTYPE html>\n" +
          document.documentElement.outerHTML;
  }

  const summary =
    getHtmlSummary(source);

  const warnings = [];

  if (!summary.validation.div_ok) {
    warnings.push(
      "div整合性NG"
    );
  }

  if (!summary.validation.js_ok) {
    warnings.push(
      "JS構文エラー"
    );
  }

  if (
    summary.validation
      .duplicate_ids.length
  ) {
    warnings.push(
      "id重複"
    );
  }

  if (
    summary.dupFuncs.length
  ) {
    warnings.push(
      "function重複"
    );
  }

  if (
    summary.undefinedFns.length
  ) {
    warnings.push(
      "未定義onclick"
    );
  }

  if (
    summary.score < 80
  ) {
    warnings.push(
      `Health Score低下 (${summary.score}/100)`
    );
  }

  if (
    warnings.length === 0
  ) {
    return true;
  }

  return confirm(
    "保存前チェック警告\n\n" +
    warnings.join("\n") +
    "\n\n続行しますか？"
  );
}

async function backupProgram() {

  saveCurrentState();

  const html =
    await getCleanProgramHtml();

  const suffix =
    getSaveFileLabel();

  if (!suffix) {
    return;
  }

  if (!preSaveCheck(html)) {
    return;
  }

  const backupData = {
    backup_type: "AI_PROMPT_PRO_FULL_BACKUP",
    backup_format_version: "1.1",
    version: APP_VERSION,
    created_at: new Date().toISOString(),
    backup_note: suffix,
    changelog: CHANGELOG,
    validation: {
      ...validateBackupHtml(
        "<!DOCTYPE html>\n" +
        document.documentElement.outerHTML
      ),
      external_scripts:
        getExternalScriptSrcList(
          document.documentElement.outerHTML
        )
    },
    html: html,
    localStorageData: {
      templates: loadJson("templates", []),
      aiPresets: loadJson("aiPresets", {}),
      dangerWords: loadJson("dangerWords", []),
      dangerPatterns: loadJson("dangerPatterns", []),
      history: loadJson("h", []),
      rawInput: localStorage.getItem("rawInput"),
      roleValue: localStorage.getItem("roleValue"),
      taskValue: localStorage.getItem("taskValue"),
      detailsValue: localStorage.getItem("detailsValue"),
      toneValue: localStorage.getItem("toneValue"),
      roughTone: localStorage.getItem("roughTone"),
      roughOutputFormat: localStorage.getItem("roughOutputFormat"),
      aiTarget: localStorage.getItem("aiTarget"),
      currentTab: localStorage.getItem("currentTab"),
      darkMode: localStorage.getItem("darkMode")
    }
  };

  const blob =
    new Blob(
      [JSON.stringify(backupData, null, 2)],
      { type: "application/json" }
    );

  const a =
    document.createElement("a");

  a.href =
    URL.createObjectURL(blob);

  const timestamp =
    new Date()
      .toISOString()
      .replace(/[:.]/g, "-");

  a.download =
    `${suffix}_AIProBackup_${APP_VERSION}_${timestamp}.json`;

  a.click();

  setTimeout(() => {
    URL.revokeObjectURL(a.href);
  }, 1000);

  saveBackupHistory(backupData);
  manageBackupHistory();

  alert(
    "フルバックアップ保存完了\n\n" +
    suffix
  );
}


  const html =
    await getCleanProgramHtml();

  if (!preSaveCheck(html)) {
    return;
  }

  const suffix =
    getSaveFileLabel();

  if (!suffix) {
    return;
  }

  const blob =
    new Blob(
      [html],
      { type: "text/html" }
    );

  const a =
    document.createElement("a");

  a.href =
    URL.createObjectURL(blob);

  const timestamp =
    new Date()
      .toISOString()
      .replace(/[:.]/g, "-");

  a.download =
`${suffix}_AIPromptPro_${APP_VERSION}_${timestamp}.html`;

  a.click();

  setTimeout(() => {

    URL.revokeObjectURL(
      a.href
    );

  }, 1000);

  alert(
    "本体HTML保存完了\n\n" +
    suffix
  );
}

function restoreProgramBackup() {
  const input =
    document.createElement("input");

  input.type = "file";
  input.accept = ".json,application/json";

  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader =
      new FileReader();

    reader.onload = () => {
      try {
        const data =
          JSON.parse(reader.result);

        if (!data || !data.localStorageData) {
          alert("フルバックアップ形式ではありません");
          return;
        }

        const scripts =
          data.validation?.external_scripts || [];

        const info =
          "バックアップ情報\n\n" +

          "version: " +
          (
            data.app_version ||
            data.version ||
            "不明"
          ) +
          "\n" +

          "created_at: " +
          (data.created_at || "不明") +
          "\n" +

          "note: " +
          (data.backup_note || "なし") +
          "\n\n" +

          "validation:\n" +

          "div: " +
          (
            data.validation?.div_ok
              ? "OK"
              : "NG"
          ) +
          "\n" +

          "js: " +
          (
            data.validation?.js_ok
              ? "OK"
              : "NG"
          ) +
          "\n\n" +

          "External Scripts:\n" +
          (
            scripts.length
              ? scripts.join("\n")
              : "なし"
          ) +

          "\n\n復元方法を選んでください。\n\n" +

          "OK：設定のみ復元\n" +
          "キャンセル：中止\n\n" +

          "※HTML本体は修復モードで読み込んで保存してください。";

        const ok =
          confirm(info);

        if (!ok) return;

        restoreLocalStorageOnly(
          data.localStorageData
        );

        alert(
          "設定のみ復元完了。再読み込みします。"
        );

        location.reload();

      } catch (err) {
        alert(
          "フル復元に失敗しました\n\n" +
          err.message
        );
      }
    };

    reader.readAsText(file);
  };

  input.click();
}

function restoreLocalStorageOnly(localStorageData) {
  Object.entries(localStorageData)
    .forEach(([key, value]) => {
      if (value === null || value === undefined) {
        localStorage.removeItem(key);
        return;
      }
      if (typeof value === "string") {
        localStorage.setItem(key, value);
      } else {
        localStorage.setItem(
          key,
          JSON.stringify(value)
        );
      }
    });
}

