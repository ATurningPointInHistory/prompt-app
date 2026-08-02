/* ===============================
   FILE: 12_knowledge_migration.js
   AI Prompt OS v7.0
   Knowledge Migration Engine v2
=============================== */


/* ===============================
   Migration Registry
=============================== */

function getKnowledgeMigrationRegistry() {

  return {
    version: "7.0.1",
    replacements: [
      { from: "IMPORT-001", to: "TRANSFER-001" },
      { from: "LOGGING-001", to: "OBSERVABILITY-001" },
      { from: "SEARCH-001", to: "RETRIEVAL-001" },
      { from: "DATABASE-001", to: "REPOSITORY-001" },
      { from: "SETTING-001", to: "CONFIGURATION-001" },
      { from: "TEST-001", to: "VALIDATION-001" },
      { from: "QUALITY-001", to: "VALIDATION-001" },
      { from: "AUDIT-001", to: "OBSERVABILITY-001" },
      { from: "MONITORING-001", to: "OBSERVABILITY-001" },
      { from: "HEALTH-001", to: "OBSERVABILITY-001" }
    ],
    metadataFields: [
      { field: "Authority:", key: "authority", insertAfter: "Owner:" },
      { field: "DependsOn:", key: "dependsOn", insertAfter: "Authority:" },
      { field: "Provides:", key: "provides", insertAfter: "DependsOn:" }
    ],
    rules: {
      preserveMemoCount: true,
      preserveUserText: true,
      overwriteKnownRulesOnly: true,
      useSaveMemoBoxes: true
    }
  };

}

/* ===============================
   Migration Scanner
=============================== */

function scanKnowledgeMigration() {

  const registry =
    getKnowledgeMigrationRegistry();

  const list =
    getKnowledgeMigrationMemoList();

  const results = [];

  list.forEach((memo, index) => {

    if (!memo || typeof memo !== "object") {
      return;
    }

    const text =
      [
        memo.id,
        memo.name,
        memo.title,
        memo.summary,
        memo.text,
        memo.relationships,
        memo.dependsOn,
        memo.provides
      ]
        .join("\n");

    const replacements =
      registry.replacements.filter(rule =>
        text.includes(rule.from)
      );

    const missingMetadata =
      registry.metadataFields.filter(rule =>
        !memo[rule.key]
      );

    if (
      replacements.length ||
      missingMetadata.length
    ) {
      results.push({
        index,
        id: memo.id || "",
        name: memo.name || "",
        title: memo.title || "",
        replacements,
        missingMetadata
      });
    }

  });

  return {
    version: registry.version,
    checked: list.length,
    candidates: results.length,
    results,
    changed: false,
    message: "Scan completed. No data was modified.",
    updatedAt: Date.now()
  };

}

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

    const field =
      typeof rule === "string"
        ? rule + (rule.endsWith(":") ? "" : ":")
        : rule.field;

    const insertAfter =
      typeof rule === "string"
        ? "Owner:"
        : rule.insertAfter;

    source =
      addMissingMetadataFieldV7(
        source,
        field,
        insertAfter
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

  const targetField =
    String(field || "").trim();

  const anchorField =
    String(insertAfter || "").trim();

  if (
    !targetField ||
    source.includes(targetField)
  ) {
    return source;
  }

  const lines =
    source.split(/\r?\n/);

  const anchorIndex =
    lines.findIndex(line =>
      String(line || "").trim() ===
      anchorField
    );

  if (anchorIndex < 0) {
    return source;
  }

  let insertIndex =
    anchorIndex + 1;

  const anchorHasInlineValue =
    anchorField.includes(":") &&
    String(lines[anchorIndex] || "")
      .trim() !== anchorField;

  if (
    !anchorHasInlineValue &&
    insertIndex < lines.length
  ) {
    const nextLine =
      String(lines[insertIndex] || "")
        .trim();

    const nextIsMetadataLabel =
      /^[A-Za-z][A-Za-z0-9 _-]*:\s*$/.test(
        nextLine
      );

    if (
      nextLine &&
      !nextIsMetadataLabel
    ) {
      insertIndex += 1;
    }
  }

  lines.splice(
    insertIndex,
    0,
    "",
    targetField
  );

  return lines.join("\n");

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