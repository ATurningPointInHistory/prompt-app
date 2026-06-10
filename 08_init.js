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

let repairIdeInitialized = false;

function initRepairIde() {

  if (repairIdeInitialized) {
    console.warn(
      "initRepairIde already initialized"
    );
    return;
  }

  repairIdeInitialized = true;

  const editor =
    get("repairEditor");

  if (!editor) {
    console.warn(
      "repairEditor not found"
    );
    return;
  }

  repairLastValue =
    editor.value || "";

  editor.addEventListener(
    "keydown",
    (e) => {

      const isSearch =
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "f";

      if (!isSearch) return;

      e.preventDefault();

      toggleRepairSearchBox();

      setTimeout(() => {

        const box =
          get("repairSearch");

        if (box) {
          box.focus();
          box.select();
        }

      }, 50);

    }
  );

  const updateCursor = () => {

    if (
      typeof updateCursorPosition ===
      "function"
    ) {
      updateCursorPosition();
    }

  };

  editor.addEventListener(
    "click",
    updateCursor
  );

  editor.addEventListener(
    "keyup",
    updateCursor
  );

  editor.addEventListener(
    "select",
    updateCursor
  );

  editor.addEventListener(
    "scroll",
    () => {

      const lineBox =
        get("lineNumbers");

      if (lineBox) {
        lineBox.scrollTop =
          editor.scrollTop;
      }

    }
  );

  editor.addEventListener(
    "input",
    () => {

      updateLineNumbers();
      updateCursor();

      if (
        repairLastValue !==
        editor.value
      ) {

        repairUndoStack.push(
          repairLastValue
        );

        repairRedoStack = [];

        repairLastValue =
          editor.value;

        updateRepairStatus(
          "変更あり"
        );

        autoSaveRepairDraft();
      }

    }
  );

  loadRepairDraft();

  updateLineNumbers();

  updateCursor();

  enableRepairEditorTabIndent();

  console.log(
    "initRepairIde initialized"
  );
}

/* ===============================
   App Events
=============================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    try {

      loadSettings();

      if (
        typeof checkSafeMode ===
        "function"
      ) {
        checkSafeMode();
      }

      initRepairIde();

      initRepairQuickPanel();

      initRepairSearchQuickPanel();

      if (
        typeof initImportFileEvents ===
        "function"
      ) {
        initImportFileEvents();
      }

      updateRepairFloatingPanelsVisibility();

    } catch (e) {

      console.error(
        "Startup Error",
        e
      );

      alert(
        "起動中にエラーが発生しました\n" +
        e.message
      );

    }

  }
);
      initImportFileEvents();
    } else {
      console.warn("initImportFileEvents is not defined");
    }

    updateRepairFloatingPanelsVisibility();

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