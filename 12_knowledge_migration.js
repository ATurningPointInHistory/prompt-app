/* ===============================
   12_knowledge_migration.js
   AI Prompt OS v7.0
   Changed Specification Patch v1
=============================== */

function patchKnowledgeObjectTextV7(text) {

  let source =
    String(text || "");

  const replaceMap = [
    ["IMPORT-001", "TRANSFER-001"],
    ["LOGGING-001", "OBSERVABILITY-001"],
    ["SEARCH-001", "RETRIEVAL-001"],
    ["DATABASE-001", "REPOSITORY-001"],
    ["SETTING-001", "CONFIGURATION-001"],
    ["TEST-001", "VALIDATION-001"],
    ["QUALITY-001", "VALIDATION-001"],
    ["AUDIT-001", "OBSERVABILITY-001"],
    ["MONITORING-001", "OBSERVABILITY-001"],
    ["HEALTH-001", "OBSERVABILITY-001"]
  ];

  replaceMap.forEach(pair => {
    const from = pair[0];
    const to = pair[1];

    source =
      source.replace(
        new RegExp(from, "g"),
        to
      );
  });

  source =
    addMissingMetadataFieldV7(
      source,
      "Authority:",
      "DecisionLevel:"
    );

  source =
    addMissingMetadataFieldV7(
      source,
      "DependsOn:",
      "Authority:"
    );

  source =
    addMissingMetadataFieldV7(
      source,
      "Provides:",
      "DependsOn:"
    );

  return source;

}

function addMissingMetadataFieldV7(
  text,
  field,
  insertAfter
) {

  const source =
    String(text || "");

  if (source.includes(field)) {
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

function patchAllMemoKnowledgeObjectsV7() {

  if (!Array.isArray(memoBoxList)) {
    console.warn("memoBoxList が見つかりません。");
    return {
      updated: 0,
      skipped: 0
    };
  }

  let count = 0;
  let skipped = 0;

  memoBoxList =
    memoBoxList.map((memo, index) => {

      if (!memo) {
        skipped++;
        return memo;
      }

      if (
        typeof isMemoLocked === "function" &&
        isMemoLocked(memo)
      ) {
        skipped++;
        return memo;
      }

      const oldText =
        String(memo.text || "");

      const newText =
        patchKnowledgeObjectTextV7(oldText);

      if (oldText !== newText) {
        count++;

        return {
          ...memo,
          text: newText,
          updatedAt: Date.now()
        };
      }

      return memo;

    });

  if (typeof normalizeMemoBoxes === "function") {
    normalizeMemoBoxes();
  }

  if (typeof saveMemoBoxes === "function") {
    saveMemoBoxes();
  } else {
    localStorage.setItem(
      "memoBoxList",
      JSON.stringify(memoBoxList)
    );
  }

  if (typeof showMemoBox === "function") {
    showMemoBox();
  }

  console.log(
    "Knowledge Object patch completed:",
    count,
    "items updated,",
    skipped,
    "items skipped"
  );

  return {
    updated: count,
    skipped: skipped
  };

}

/* ===============================
   Migration Execute
=============================== */

function executeKnowledgeMigration() {

  if (
    typeof patchAllMemoKnowledgeObjectsV7 !== "function"
  ) {
    return {
      updated: 0,
      skipped: 0,
      error: "patchAllMemoKnowledgeObjectsV7 is not found."
    };
  }

  const result =
    patchAllMemoKnowledgeObjectsV7();

  return {
    updated:
      result?.updated || 0,

    skipped:
      result?.skipped || 0,

    message:
      "Knowledge migration executed.",

    updatedAt:
      Date.now()
  };

}

/* ===============================
   Migration Validation
=============================== */

function validateKnowledgeMigration() {

  if (!Array.isArray(memoBoxList)) {

    return {
      valid: false,
      checked: 0,
      errors: [
        "memoBoxList not found."
      ]
    };

  }

  const errors = [];

  memoBoxList.forEach((memo, index) => {

    if (!memo) {
      errors.push(
        `#${index} Memo not found.`
      );
      return;
    }

    if (!memo.text) {
      return;
    }

    const text =
      String(memo.text);

    if (
      text.includes("IMPORT-001") ||
      text.includes("SEARCH-001") ||
      text.includes("DATABASE-001") ||
      text.includes("SETTING-001") ||
      text.includes("TEST-001") ||
      text.includes("QUALITY-001") ||
      text.includes("AUDIT-001") ||
      text.includes("MONITORING-001") ||
      text.includes("HEALTH-001") ||
      text.includes("LOGGING-001")
    ) {

      errors.push(
        `${memo.id || memo.name || index} : old IDs remain.`
      );

    }

  });

  return {

    valid:
      errors.length === 0,

    checked:
      memoBoxList.length,

    errorCount:
      errors.length,

    errors,

    updatedAt:
      Date.now()

  };

}

window.patchKnowledgeObjectTextV7 =
  patchKnowledgeObjectTextV7;

window.addMissingMetadataFieldV7 =
  addMissingMetadataFieldV7;

window.patchAllMemoKnowledgeObjectsV7 =
  patchAllMemoKnowledgeObjectsV7;

window.executeKnowledgeMigration =
  executeKnowledgeMigration;

window.validateKnowledgeMigration =
  validateKnowledgeMigration;