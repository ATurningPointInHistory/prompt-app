/* ===============================
   FILE: 01_task_manager.js
   Task Manager v2
=============================== */

/* ===============================
   Task Names
=============================== */

const TASK = {
  PROJECT_LOAD: "projectLoad",
  MODULE_ANALYZE: "moduleAnalyze",
  FUNCTION_ANALYZE: "functionAnalyze",
  PROJECT_ANALYZE: "projectAnalyze",
  PROJECT_MAINTENANCE: "projectMaintenance",
  HEALTH: "health",
  BACKUP: "backup",
  AI_DEBUG: "aiDebug",
  AI_INTEGRATION: "aiIntegration",
  DEV_CONSOLE: "devConsole"
};

/* ===============================
   Task State
=============================== */

const runningTasks =
  new Set();

const taskButtons =
  {};

const taskLabels =
  {};

/* ===============================
   Task Status
=============================== */

function isTaskRunning(
  taskName
) {

  return runningTasks.has(
    taskName
  );

}

function getRunningTasks() {

  return [
    ...runningTasks
  ];

}

/* ===============================
   Task Button
=============================== */

function setTaskButton(
  taskName,
  buttonId,
  label = ""
) {

  if (!taskName || !buttonId) {
    return;
  }

  taskButtons[taskName] =
    buttonId;

  if (label) {
    taskLabels[taskName] =
      label;
  }

  updateTaskButtons();

}

function updateTaskButtons() {

  Object.keys(taskButtons)
    .forEach(taskName => {

      const button =
        get(
          taskButtons[taskName]
        );

      if (!button) {
        return;
      }

      const label =
        taskLabels[taskName] ||
        button.dataset.originalLabel ||
        button.textContent ||
        taskName;

      if (!button.dataset.originalLabel) {
        button.dataset.originalLabel =
          label;
      }

      if (
        runningTasks.has(
          taskName
        )
      ) {

        button.disabled = true;

        button.textContent =
          label + "...";

      } else {

        button.disabled = false;

        button.textContent =
          button.dataset.originalLabel;

      }

    });

}

/* ===============================
   Start Task
=============================== */

function startTask(
  taskName,
  label = ""
) {

  const displayName =
    label ||
    taskLabels[taskName] ||
    taskName;

  if (
    runningTasks.has(
      taskName
    )
  ) {

    alert(
      displayName +
      " は実行中です"
    );

    return false;

  }

  runningTasks.add(
    taskName
  );

  updateTaskButtons();

  if (
    typeof updateRepairStatus === "function"
  ) {
    updateRepairStatus(
      displayName +
      " 実行中..."
    );
  }

  return true;

}

/* ===============================
   Finish Task
=============================== */

function finishTask(
  taskName,
  label = ""
) {

  const displayName =
    label ||
    taskLabels[taskName] ||
    taskName;

  runningTasks.delete(
    taskName
  );

  updateTaskButtons();

  if (
    typeof updateRepairStatus === "function"
  ) {
    updateRepairStatus(
      displayName +
      " 完了"
    );
  }

}

/* ===============================
   Run Task
=============================== */

async function runTask(
  taskName,
  label,
  callback,
  options = {}
) {

  if (
    typeof callback !== "function"
  ) {
    alert("Task callback が未定義です");
    return null;
  }

  if (
    !startTask(
      taskName,
      label
    )
  ) {
    return null;
  }

  const startedAt =
    Date.now();

  try {

    const result =
      await callback();

    if (!options.silent) {

      const elapsed =
        Date.now() - startedAt;

      console.log(
        "Task completed:",
        taskName,
        elapsed + "ms"
      );

    }

    return result;

  } catch (e) {

    console.error(
      "Task failed:",
      taskName,
      e
    );

    if (!options.silentError) {
      alert(
        (label || taskName) +
        " 失敗\n\n" +
        e.message
      );
    }

    return null;

  } finally {

    finishTask(
      taskName,
      label
    );

  }

}

/* ===============================
   Run Task Sync
=============================== */

function runTaskSync(
  taskName,
  label,
  callback,
  options = {}
) {

  if (
    typeof callback !== "function"
  ) {

    alert(
      "Task callback が未定義です"
    );

    return null;

  }

  if (
    !startTask(
      taskName,
      label
    )
  ) {

    return null;

  }

  const startedAt =
    Date.now();

  try {

    const result =
      callback();

    if (
      !options.silent
    ) {

      console.log(
        "Task completed:",
        taskName,
        Date.now() -
        startedAt +
        "ms"
      );

    }

    return result;

  } catch (e) {

    console.error(
      "Task failed:",
      taskName,
      e
    );

    if (
      !options.silentError
    ) {

      alert(
        (label || taskName) +
        " 失敗\n\n" +
        e.message
      );

    }

    return null;

  } finally {

    finishTask(
      taskName,
      label
    );

  }

}

/* ===============================
   Clear Task
=============================== */

function clearTask(
  taskName
) {

  runningTasks.delete(
    taskName
  );

  updateTaskButtons();

}

/* ===============================
   Clear All Tasks
=============================== */

function clearAllTasks() {

  runningTasks.clear();

  updateTaskButtons();

}

/* ===============================
   Global Export
=============================== */

window.TASK =
  TASK;

window.isTaskRunning =
  isTaskRunning;

window.getRunningTasks =
  getRunningTasks;

window.setTaskButton =
  setTaskButton;

window.updateTaskButtons =
  updateTaskButtons;

window.startTask =
  startTask;

window.finishTask =
  finishTask;

window.runTask =
  runTask;

window.clearTask =
  clearTask;

window.clearAllTasks =
  clearAllTasks;

window.runTaskSync =
  runTaskSync;

console.log(
  "01_task_manager loaded"
);