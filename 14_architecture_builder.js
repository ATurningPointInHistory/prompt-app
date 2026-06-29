/* ===============================
   Build Architecture Database From Project
=============================== */

function buildArchitectureDatabaseFromProject() {

  if (
    typeof updateProjectDatabase === "function"
  ) {
    updateProjectDatabase();
  }

  if (!window.projectDatabase) {
    alert(
      "Project Database がありません"
    );
    return;
  }

  registerProjectFilesAsObjects();

  registerProjectModulesAsObjects();

  registerProjectFunctionsAsObjects();

  buildArchitectureRelationshipsFromProject();

  // 一括登録完了後に1回だけ実行
  rebuildArchitectureIndexes();

  saveArchitectureDatabase();

  return buildArchitectureDatabaseReport();

}

/* ===============================
   Register Project Files As Objects
=============================== */

function registerProjectFilesAsObjects() {

  const files =
    window.projectDatabase.files || {};

  Object.values(files).forEach(file => {

    registerArchitectureObject(
      {
        id:
          `FILE:${file.fileName}`,

        type:
          "File",

        title:
          file.fileName,

        summary:
          `File / lines: ${file.lineCount || 0}`,

        description:
          file.fileName || "",

        layer:
          "Project Layer",

        category:
          "File",

        priority:
          "Normal",

        tags:
          ["file"],

        metadata: {
          fileName:
            file.fileName || "",

          lineCount:
            file.lineCount || 0,

          charCount:
            file.charCount || 0,

          updatedAt:
            file.updatedAt || ""
        }
      },
      {
        rebuild: false,
        save: false
      }
    );

  });

}

/* ===============================
   Register Project Modules As Objects
=============================== */

function registerProjectModulesAsObjects() {

  const modules =
    window.projectDatabase.modules || {};

  Object.values(modules).forEach(module => {

    registerArchitectureObject(
      {
        id:
          `MODULE:${module.fileName}`,

        type:
          "Module",

        title:
          module.fileName,

        summary:
          module.summary || "",

        description:
          module.role || "",

        layer:
          "Project Layer",

        category:
          "Module",

        priority:
          "Normal",

        tags:
          module.keywords || [
            "module"
          ],

        metadata: {

          fileName:
            module.fileName || "",

          functionCount:
            module.functionCount || 0,

          lineCount:
            module.lineCount || 0,

          risk:
            module.risk || "",

          role:
            module.role || ""

        }

      },
      {
        rebuild: false,
        save: false
      }
    );

    addArchitectureRelationship(

      `MODULE:${module.fileName}`,

      `FILE:${module.fileName}`,

      "ContainedIn",

      "Module belongs to file",

      {
        rebuild: false,
        save: false
      }

    );

  });

}

/* ===============================
   Register Project Functions As Objects
=============================== */

function registerProjectFunctionsAsObjects() {

  const functions =
    window.projectDatabase.functions || {};

  Object.values(functions).forEach(fn => {

    registerArchitectureObject(
      {
        id:
          `FUNCTION:${fn.name}`,

        type:
          "Function",

        title:
          fn.name,

        summary:
          fn.summary || "",

        description:
          fn.role || "",

        layer:
          "Project Layer",

        category:
          fn.section || "Function",

        priority:
          fn.handoffPriority || "Normal",

        tags:
          fn.keywords || [
            "function"
          ],

        metadata: {

          fileName:
            fn.fileName || "",

          line:
            fn.line || 0,

          start:
            fn.start || 0,

          end:
            fn.end || 0,

          risk:
            fn.risk || "",

          callCount:
            fn.callCount || 0,

          parameters:
            fn.parameters || [],

          returnValue:
            fn.returnValue || "",

          moduleRole:
            fn.moduleRole || ""

        }

      },
      {
        rebuild: false,
        save: false
      }
    );

    if (fn.fileName) {

      addArchitectureRelationship(
        `FUNCTION:${fn.name}`,
        `MODULE:${fn.fileName}`,
        "ContainedIn",
        "Function belongs to module",
        {
          rebuild: false,
          save: false
        }
      );

      addArchitectureRelationship(
        `FUNCTION:${fn.name}`,
        `FILE:${fn.fileName}`,
        "ContainedIn",
        "Function belongs to file",
        {
          rebuild: false,
          save: false
        }
      );

    }

  });

}

/* ===============================
   Build Architecture Relationships From Project
=============================== */

function buildArchitectureRelationshipsFromProject() {

  const functions =
    window.projectDatabase.functions || {};

  Object.values(functions).forEach(fn => {

    const calledList =
      Array.isArray(fn.called)
        ? fn.called
        : [];

    calledList.forEach(calledName => {

      if (
        functions[calledName]
      ) {

        addArchitectureRelationship(
          `FUNCTION:${fn.name}`,
          `FUNCTION:${calledName}`,
          "Calls",
          "Function calls another function",
          {
            rebuild: false,
            save: false
          }
        );

      }

    });

  });

}

/* ===============================
   Global Export
=============================== */

window.buildArchitectureDatabaseFromProject =
  buildArchitectureDatabaseFromProject;

window.registerProjectFilesAsObjects =
  registerProjectFilesAsObjects;

window.registerProjectModulesAsObjects =
  registerProjectModulesAsObjects;

window.registerProjectFunctionsAsObjects =
  registerProjectFunctionsAsObjects;

window.buildArchitectureRelationshipsFromProject =
  buildArchitectureRelationshipsFromProject;