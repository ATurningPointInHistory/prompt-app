/* ===============================
   FILE: 07_safe_mode.js
   Safe Mode / Emergency Recovery
=============================== */

function checkSafeMode() {
  const crash =
    localStorage.getItem("lastCrash");

  if (!crash) return;

  let info = {};

  try {
    info = JSON.parse(crash);
  } catch {
    info = {
      message: String(crash),
      time: "unknown"
    };
  }

  const msg =
`SAFE MODE
前回エラー終了を検出しました。

message:
${info.message || "unknown"}

line:
${info.line || "unknown"}

column:
${info.column || "unknown"}

time:
${info.time || "unknown"}

修復モードで起動しますか？`;

  const ok =
    confirm(msg);

  if (!ok) {
    localStorage.removeItem("lastCrash");
    return;
  }

  switchAppPage("repair");

  const draft =
    localStorage.getItem(
      "repairDraftHtml"
    );

  if (
    draft &&
    !get("repairEditor").value.trim()
  ) {
    get("repairEditor").value =
      draft;

    repairLastValue =
      draft;

    if (typeof updateLineNumbers === "function") {
          updateLineNumbers();
        }

        if (typeof updateCursorPosition === "function") {
      updateCursorPosition();
        }

        if (typeof updateRepairStatus === "function") {
          updateRepairStatus(
            "SAFE MODE復元"
          );
        }
  }

  const debugBox =
    get("debugBox");

  if (debugBox) {
    debugBox.style.display = "block";
    debugBox.innerText =
`SAFE MODE
前回クラッシュ情報

message:
${info.message || "unknown"}

line:
${info.line || "unknown"}

column:
${info.column || "unknown"}

time:
${info.time || "unknown"}`;
  }

  localStorage.removeItem("lastCrash");
}