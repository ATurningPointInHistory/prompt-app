/* ===============================
   FILE: 99_init.js
   Init / Event
=============================== */

/* ===============================
   Error Handler
=============================== */

window.onerror = function(
  message,
  source,
  line,
  column,
  error
) {

  try {
    localStorage.setItem(
      "lastCrash",
      JSON.stringify({
        message,
        line,
        column,
        source,
        stack: error?.stack || "no stack",
        time: new Date().toISOString()
      })
    );
  } catch (e) {
    console.warn("lastCrash save failed", e);
  }

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

let repairIdeInitialized = false;

function initRepairIde() {

  if (repairIdeInitialized) {
    console.warn("initRepairIde already initialized");
    return;
  }

  const editor = get("repairEditor");

  if (!editor) {
    console.warn("repairEditor not found");
    return;
  }

  repairIdeInitialized = true;

  repairLastValue = editor.value || "";

  editor.addEventListener("keydown", (e) => {

    const isSearch =
      (e.ctrlKey || e.metaKey) &&
      e.key.toLowerCase() === "f";

    if (!isSearch) return;

    e.preventDefault();

    if (typeof toggleRepairSearchBox === "function") {
      toggleRepairSearchBox();
    }

    setTimeout(() => {
      const box = get("repairSearch");
      if (box) {
        box.focus();
        box.select();
      }
    }, 50);
  });

  const updateCursor = () => {
    if (typeof updateCursorPosition === "function") {
      updateCursorPosition();
    }
  };

  editor.addEventListener("click", updateCursor);
  editor.addEventListener("keyup", updateCursor);
  editor.addEventListener("select", updateCursor);

  editor.addEventListener("scroll", () => {
    const lineBox = get("lineNumbers");
    if (lineBox) {
      lineBox.scrollTop = editor.scrollTop;
    }
  });

  editor.addEventListener("input", () => {

    if (typeof updateLineNumbers === "function") {
      updateLineNumbers();
    }

    updateCursor();

    if (repairLastValue !== editor.value) {

      repairUndoStack.push(repairLastValue);
      repairRedoStack = [];

      repairLastValue = editor.value;

      if (typeof updateRepairStatus === "function") {
        updateRepairStatus("変更あり");
      }

      if (typeof autoSaveRepairDraft === "function") {
        autoSaveRepairDraft();
      }
    }
  });

  safeRun(loadRepairDraft, "loadRepairDraft");
  safeRun(updateLineNumbers, "updateLineNumbers");
  updateCursor();
  safeRun(enableRepairEditorTabIndent, "enableRepairEditorTabIndent");

  console.log("initRepairIde initialized");
}

/* ===============================
   App Events
=============================== */

document.addEventListener("DOMContentLoaded", () => {

  try {

    const startupTasks = [
      ["loadSettings", "loadSettings"],
      ["checkSafeMode", "checkSafeMode"],
      ["initMobileConsole", "initMobileConsole"],
      ["initRepairIde", "initRepairIde"],
      ["initRepairQuickFavoritePanel", "initRepairQuickFavoritePanel"],
      ["initRepairSearchQuickPanel", "initRepairSearchQuickPanel"],
      ["initImportFileEvents", "initImportFileEvents"],
      ["updateRepairFloatingPanelsVisibility", "updateRepairFloatingPanelsVisibility"]
    ];

    startupTasks.forEach(([fnName, label]) => {

      const fn =
        window[fnName];

      if (typeof fn === "function") {
        safeRun(fn, label);
      } else {
        console.warn(label + " is not defined");
      }

    });

    setTimeout(() => {

      if (
        typeof initRepairQuickFavoritePanel === "function"
      ) {
        initRepairQuickFavoritePanel();
      }

    }, 300);

  } catch (e) {

    console.error("Startup Error", e);

    alert(
      "起動中にエラーが発生しました\n" +
      e.message
    );

  }

});

document.addEventListener("input", () => {
  safeRun(saveCurrentState, "saveCurrentState");
});

document.addEventListener("change", () => {
  safeRun(saveCurrentState, "saveCurrentState");
});

if (typeof recordMacroClick === "function") {

  document.addEventListener(
    "click",
    recordMacroClick,
    true
  );

} else {

  console.warn(
    "recordMacroClick is not defined"
  );
}