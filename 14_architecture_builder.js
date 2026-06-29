/* ===============================
   Build Architecture DB From Project
=============================== */

function buildArchitectureDatabaseFromProject() {

  if (
    typeof updateProjectDatabase === "function"
  ) {
    updateProjectDatabase();
  }

  if (!window.projectDatabase) {
    alert("Project Database がありません");
    return;
  }

  registerProjectFilesAsObjects();
  registerProjectModulesAsObjects();
  registerProjectFunctionsAsObjects();
  buildArchitectureRelationshipsFromProject();

  rebuildArchitectureIndexes();
  saveArchitectureDatabase();

  return buildArchitectureDatabaseReport();

}

/* ===============================
   Register Files
=============================== */

function registerProjectFilesAsObjects() {

  const files =
    window.projectDatabase.files || {};

  Object.values(files).forEach(file => {

    registerArchitectureObject({
      id:
        `FILE:${file.fileName}`,

      type:
        "File",

      title:
        file.fileName,

      summary:
        `File / lines: ${file.lineCount || 0}`,

      layer:
        "Project Layer",

      category:
        "File",

      priority:
        "Normal",

      tags:
        ["file"],

      metadata: {
        lineCount:
          file.lineCount || 0,

        charCount:
          file.charCount || 0
      }
    });

  });

}

/* ===============================
   Register Modules
=============================== */

function registerProjectModulesAsObjects() {

  const modules =
    window.projectDatabase.modules || {};

  Object.values(modules).forEach(module => {

    registerArchitectureObject({
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
        module.keywords || ["module"],

      metadata: {
        functionCount:
          module.functionCount || 0,

        lineCount:
          module.lineCount || 0,

        risk:
          module.risk || ""
      }
    });

    addArchitectureRelationship(
      `MODULE:${module.fileName}`,
      `FILE:${module.fileName}`,
      "ContainedIn",
      "Module belongs to file"
    );

  });

}

/* ===============================
   Register Functions
=============================== */

function registerProjectFunctionsAsObjects() {

  const functions =
    window.projectDatabase.functions || {};

  Object.values(functions).forEach(fn => {

    registerArchitectureObject({
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
        fn.keywords || ["function"],

      metadata: {
        fileName:
          fn.fileName || "",

        line:
          fn.line || 0,

        risk:
          fn.risk || "",

        callCount:
          fn.callCount || 0,

        parameters:
          fn.parameters || []
      }
    });

    if (fn.fileName) {

      addArchitectureRelationship(
        `FUNCTION:${fn.name}`,
        `MODULE:${fn.fileName}`,
        "ContainedIn",
        "Function belongs to module"
      );

      addArchitectureRelationship(
        `FUNCTION:${fn.name}`,
        `FILE:${fn.fileName}`,
        "ContainedIn",
        "Function belongs to file"
      );

    }

  });

}

/* ===============================
   Build Function Call Relationships
=============================== */

function buildArchitectureRelationshipsFromProject() {

  const functions =
    window.projectDatabase.functions || {};

  Object.values(functions).forEach(fn => {

    (fn.called || []).forEach(calledName => {

      if (
        functions[calledName]
      ) {

        addArchitectureRelationship(
          `FUNCTION:${fn.name}`,
          `FUNCTION:${calledName}`,
          "Calls",
          "Function calls another function"
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