/* ===============================
   FILE: 12_knowledge_migration.js
   AI Prompt OS v7.0
   Knowledge Migration Engine v2
=============================== */

/* ===============================
   Memo List Access
=============================== */

function getKnowledgeMigrationMemoList() {

  if (Array.isArray(memoBoxList)) {
    return memoBoxList;
  }

  if (typeof getMemoBoxList === "function") {
    return getMemoBoxList();
  }

  return [];

}

/* ===============================
   Text Patch
=============================== */

function patchKnowledgeObjectTextV7(text) {

  let source =
    String(text || "");

  const registry =
    getKnowledgeMigrationRegistry();

  registry.replacements.forEach(rule => {

    if (!rule.from) {
      return;
    }

    source =
      source
        .split(rule.from)
        .join(rule.to);

  });

  registry.metadataFields.forEach(rule => {

    source =
      addMissingMetadataFieldV7(
        source,
        rule.field,
        rule.insertAfter
      );

  });

  return source;

}

/* ===============================
   Add Missing Metadata Field
=============================== */

function addMissingMetadataFieldV7(
  text,
  field,
  insertAfter
) {

  const source =
    String(text || "");

  if (
    !field ||
    source.includes(field)
  ) {
    return source;
  }

  if (!source.includes(insertAfter)) {
    return source;
  }

  return source.replace(
    insertAfter,
    insertAfter + "\n\n" + field
  );

}

/* ===============================
   Finalize Save
=============================== */

function finalizeKnowledgeMigrationSave(list) {

  if (typeof normalizeMemoBoxes === "function") {
    normalizeMemoBoxes();
  }

  if (typeof saveMemoBoxes === "function") {
    saveMemoBoxes();
  } else {
    localStorage.setItem(
      "memoBoxList",
      JSON.stringify(list)
    );
  }

  if (typeof showMemoBox === "function") {
    showMemoBox();
  }

}

/* ===============================
   Execute Migration
=============================== */

function executeKnowledgeMigration() {

  const list =
    getKnowledgeMigrationMemoList();

  if (!Array.isArray(list)) {

    return {
      updated: 0,
      checked: 0,
      error: "memoBoxList not found."
    };

  }

  const scan =
    scanKnowledgeMigration();

  if (!scan.results.length) {

    return {
      updated: 0,
      checked: scan.checked,
      candidates: 0,
      message: "No migration candidates.",
      updatedAt: Date.now()
    };

  }

  let updated = 0;
  let skipped = 0;

  scan.results.forEach(result => {

    const memo =
      list[result.index];

    if (
      !memo ||
      typeof memo.text !== "string"
    ) {
      skipped++;
      return;
    }

    const oldText =
      memo.text;

    const newText =
      patchKnowledgeObjectTextV7(oldText);

    if (oldText !== newText) {

      memo.text =
        newText;

      memo.updatedAt =
        Date.now();

      updated++;

    }

  });

  finalizeKnowledgeMigrationSave(list);

  console.log(
    "Knowledge Migration completed:",
    updated,
    "items updated,",
    skipped,
    "items skipped"
  );

  return {
    checked: scan.checked,
    candidates: scan.candidates,
    updated: updated,
    skipped: skipped,
    message:
      updated
        ? "Migration completed."
        : "No changes.",
    updatedAt: Date.now()
  };

}

/* ===============================
   Validate Migration
=============================== */

function validateKnowledgeMigration() {

  const list =
    getKnowledgeMigrationMemoList();

  if (!Array.isArray(list)) {

    return {
      valid: false,
      checked: 0,
      errorCount: 1,
      errors: [
        "memoBoxList not found."
      ],
      updatedAt: Date.now()
    };

  }

  const registry =
    getKnowledgeMigrationRegistry();

  const errors = [];

  list.forEach((memo, index) => {

    if (!memo) {
      errors.push(
        `#${index} Memo not found.`
      );
      return;
    }

    const text =
      String(memo.text || "");

    if (!text) {
      return;
    }

    registry.replacements.forEach(rule => {

      if (text.includes(rule.from)) {

        errors.push(
          `${memo.id || memo.name || index} : old ID remains: ${rule.from}`
        );

      }

    });

  });

  return {
    valid: errors.length === 0,
    checked: list.length,
    errorCount: errors.length,
    errors: errors,
    updatedAt: Date.now()
  };

}

/* ===============================
   Compatibility Wrapper
=============================== */

function patchAllMemoKnowledgeObjectsV7() {

  return executeKnowledgeMigration();

}

/* ===============================
   Export
=============================== */

window.getKnowledgeMigrationRegistry =
  getKnowledgeMigrationRegistry;

window.getKnowledgeMigrationMemoList =
  getKnowledgeMigrationMemoList;

window.patchKnowledgeObjectTextV7 =
  patchKnowledgeObjectTextV7;

window.addMissingMetadataFieldV7 =
  addMissingMetadataFieldV7;

window.scanKnowledgeMigration =
  scanKnowledgeMigration;

window.executeKnowledgeMigration =
  executeKnowledgeMigration;

window.validateKnowledgeMigration =
  validateKnowledgeMigration;

window.patchAllMemoKnowledgeObjectsV7 =
  patchAllMemoKnowledgeObjectsV7;

window.finalizeKnowledgeMigrationSave =
  finalizeKnowledgeMigrationSave;