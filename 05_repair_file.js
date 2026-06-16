/* ===============================
   FILE: 05_repair_file.js
   Repair File I/O
=============================== */

function normalizeLoadedHtmlText(text) {
  if (!text) return "";

  let html = String(text);

  // UTF-8 BOM除去
  html = html.replace(/^\uFEFF/, "");

  // 改行コード統一
  html = html
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  return html;
}

function looksLikeHtml(text) {
  if (!text) return false;

  const source =
    String(text).trim();

  return (
    /^<!DOCTYPE html/i.test(source) ||
    /^<html[\s>]/i.test(source) ||
    /<html[\s>]/i.test(source) &&
    /<body[\s>]/i.test(source)
  );
}

function resetRepairEditorState(html) {
  repairUndoStack = [];
  repairRedoStack = [];
  repairLastValue = html;

  try {
    localStorage.setItem(
      "repairDraftHtml",
      html
    );

    localStorage.setItem(
      "repairDraftSavedAt",
      new Date().toISOString()
    );
  } catch (e) {
    console.warn(
      "repairDraftHtml保存失敗",
      e
    );
  }

  if (typeof updateLineNumbers === "function") {
    updateLineNumbers();
  }

  if (typeof updateCursorPosition === "function") {
    updateCursorPosition();
  }

  if (typeof updateRepairStatus === "function") {
    updateRepairStatus(
      "HTMLを読み込みました"
    );
  }
}

/* ===============================
   Repair File I/O
=============================== */

function loadRepairHtml() {

  const input =
    document.createElement("input");

  input.type = "file";

  input.accept =
    ".html,.htm,.js,.json,.txt," +
    "text/html,text/javascript," +
    "application/json";

  input.onchange = (event) => {

    const file =
      event &&
      event.target &&
      event.target.files &&
      event.target.files[0];

    if (!file) {
      return;
    }

    const maxSize =
      5 * 1024 * 1024;

    if (file.size > maxSize) {

      alert(
        "ファイルサイズが大きすぎます。\n" +
        "5MB以下のファイルを選択してください。"
      );

      return;
    }

    currentRepairFile =
      file.name || "";

    localStorage.setItem(
      "repairCurrentFile",
      currentRepairFile
    );

    const reader =
      new FileReader();

    reader.onload = () => {

      let text =
        normalizeLoadedHtmlText(
          reader.result
        );

      if (!text.trim()) {

        alert(
          "空のファイルです"
        );

        return;
      }

      // JSONバックアップ対応

      if (
        file.name
          .toLowerCase()
          .endsWith(".json")
      ) {

        try {

          const parsed =
            JSON.parse(text);

          if (
            parsed &&
            typeof parsed.html ===
            "string"
          ) {

            text =
              normalizeLoadedHtmlText(
                parsed.html
              );

            if (typeof updateRepairStatus === "function") {
              updateRepairStatus(
                "フルバックアップJSON読込: " +
                currentRepairFile
              );
            }

          }

        } catch (e) {

          console.warn(
            "JSON解析失敗",
            e
          );

        }
      }

      const editor =
        get("repairEditor");

      if (!editor) {

        alert(
          "repairEditorが見つかりません"
        );

        return;
      }

      const isHtmlLike =
        looksLikeHtml(text);

      if (!isHtmlLike) {

        const ok =
          confirm(
            "HTMLとして認識しにくい内容です。\n" +
            "そのまま読み込みますか？"
          );

        if (!ok) {
          return;
        }
      }

      editor.value =
        text;

      repairOriginalHtml =
        text;

      editor.scrollTop =
        0;

      editor.scrollLeft =
        0;

      resetRepairEditorState(
        text
      );

      if (typeof updateLineNumbers === "function") {
        updateLineNumbers();
      }

      if (typeof updateCursorPosition === "function") {
        updateCursorPosition();
      }

      if (typeof updateRepairStatus === "function") {
        updateRepairStatus(
          "読込: " +
          currentRepairFile
        );
      }

      alert(
        "読込完了\n\n" +
        currentRepairFile
      );
    };

    reader.onerror = () => {

      alert(
        "ファイルの読み込みに失敗しました"
      );

    };

    reader.readAsText(
      file,
      "UTF-8"
    );
  };

  input.click();
}

function saveRepairHtml() {

  const editor =
    get("repairEditor");

  if (!editor) {
    return;
  }

  const text =
    editor.value.trim();

  if (!text) {
    alert(
      "保存内容が空です"
    );
    return;
  }

  const timestamp =
    new Date()
      .toISOString()
      .replace(/[:.]/g, "-");

  const filename =
    (
      typeof currentRepairFile !== "undefined" &&
      currentRepairFile
    )
      ? currentRepairFile
      : `AIPro_Repaired_${timestamp}.html`;

  const type =
    filename.endsWith(".js")
      ? "text/javascript"
      : "text/html";

  const blob =
    new Blob(
      [text],
      { type }
    );

  const a =
    document.createElement("a");

  a.href =
    URL.createObjectURL(
      blob
    );

  a.download =
    filename;

  a.click();

  setTimeout(() => {
    URL.revokeObjectURL(
      a.href
    );
  }, 1000);

  repairLastValue =
    editor.value;

  if (typeof updateRepairStatus === "function") {
    updateRepairStatus(
      `保存完了: ${filename}`
    );
  }

  alert(
    "保存完了\n\n" +
    filename
  );
}

async function copyRepairHtml() {
  const editor =
    get("repairEditor");

  if (!editor) return;

  const html =
    editor.value.trim();

  if (!html) {
    alert("HTMLが空です");
    return;
  }

  try {
    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {
      await navigator.clipboard.writeText(html);
      alert("HTMLコピー完了");
      return;
    }

    const ok =
      copyTextFallback(html);

    alert(
      ok
        ? "HTMLコピー完了"
        : "コピー失敗"
    );

  } catch (e) {
    const ok =
      copyTextFallback(html);

    alert(
      ok
        ? "HTMLコピー完了"
        : "コピー失敗"
    );
  }
}


