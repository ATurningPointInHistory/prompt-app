/* ===============================
   FILE: 08_init.js
   Init / Event
=============================== */

/* ===============================
   Error Handler
=============================== */

window.onerror =
  function(
    message,
    source,
    line,
    column,
    error
  ) {

  localStorage.setItem(
    "lastCrash",
    JSON.stringify({
      message,
      line,
      column,
      source,
      stack:
        error?.stack ||
        "no stack",
      time:
        new Date()
          .toISOString()
    })
  );

  if (!DEBUG_MODE) return;

  const box = get("debugBox");
  if (!box) return;

  box.style.display = "block";
  box.innerText =
`JS Error
message:
${message}
line:
${line}
column:
${column}
source:
${source}
stack:
${error?.stack || "no stack"}`;
};

/* ===============================
   Repair IDE Init
=============================== */

function initRepairIde() {
  const editor = get("repairEditor");
  if (!editor) return;

  repairLastValue = editor.value || "";

  editor.addEventListener("keydown", (e) => {
    const isSearch =
      (e.ctrlKey || e.metaKey) &&
      e.key.toLowerCase() === "f";

    if (!isSearch) return;

    e.preventDefault();
    toggleRepairSearchBox();

    setTimeout(() => {
      const box = get("repairSearch");
      if (box) {
        box.focus();
        box.select();
      }
    }, 50);
  });

  editor.addEventListener("click", updateCursorPosition);
  editor.addEventListener("keyup", updateCursorPosition);
  editor.addEventListener("select", updateCursorPosition);

  editor.addEventListener("scroll", () => {
    const lineBox = get("lineNumbers");
    if (lineBox) {
      lineBox.scrollTop = editor.scrollTop;
    }
  });

  editor.addEventListener("input", () => {
    updateLineNumbers();
    updateCursorPosition();

    if (repairLastValue !== editor.value) {
      repairUndoStack.push(repairLastValue);
      repairRedoStack = [];
      repairLastValue = editor.value;
      updateRepairStatus("変更あり");
      autoSaveRepairDraft();
    }
  });

  loadRepairDraft();
  updateLineNumbers();
  updateCursorPosition();
  enableRepairEditorTabIndent();
}

/* ===============================
   App Events
=============================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadSettings();

    if (typeof checkSafeMode === "function") {
      checkSafeMode();
    } else {
      console.warn("checkSafeMode is not defined");
    }

    initRepairIde();

    initRepairQuickPanel();

    initImportFileEvents();

  }
);
document.addEventListener(
  "input",
  saveCurrentState
);

document.addEventListener(
  "change",
  saveCurrentState
);