/* ===============================
   FILE: 01_task_manager.js
   Task Manager
=============================== */

const runningTasks =
  new Set();

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

/* ===============================
   Start Task
=============================== */

function startTask(
  taskName,
  label = ""
) {

  if (
    runningTasks.has(
      taskName
    )
  ) {

    alert(
      (label || taskName) +
      " は実行中です"
    );

    return false;

  }

  runningTasks.add(
    taskName
  );

  return true;

}

/* ===============================
   Finish Task
=============================== */

function finishTask(
  taskName
) {

  runningTasks.delete(
    taskName
  );

}

/* ===============================
   Run Task
=============================== */

async function runTask(
  taskName,
  label,
  callback
) {

  if (
    !startTask(
      taskName,
      label
    )
  ) {
    return null;
  }

  try {

    if (
      typeof updateRepairStatus === "function"
    ) {
      updateRepairStatus(
        (label || taskName) +
        " 実行中..."
      );
    }

    const result =
      await callback();

    if (
      typeof updateRepairStatus === "function"
    ) {
      updateRepairStatus(
        (label || taskName) +
        " 完了"
      );
    }

    return result;

  } catch (e) {

    console.error(e);

    alert(
      (label || taskName) +
      " 失敗\n\n" +
      e.message
    );

    return null;

  } finally {

    finishTask(
      taskName
    );

  }

}

/* ===============================
   Clear Task
=============================== */

function clearTask(
  taskName
) {

  finishTask(
    taskName
  );

}

/* ===============================
   Clear All Tasks
=============================== */

function clearAllTasks() {

  runningTasks.clear();

}

/* ===============================
   Global Export
=============================== */

window.isTaskRunning =
  isTaskRunning;

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

console.log(
  "01_task_manager loaded"
);

