/* ===============================
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
    return;
  }

  let count = 0;

  memoBoxList =
    memoBoxList.map(memo => {

      const oldText =
        String(memo.text || "");

      const newText =
        patchKnowledgeObjectTextV7(oldText);

      if (oldText !== newText) {
        count++;
      }

      return {
        ...memo,
        text: newText
      };

    });

  saveJson(
    "memoBoxList",
    memoBoxList
  );

  if (typeof renderMemoBoxList === "function") {
    renderMemoBoxList();
  }

  console.log(
    "Knowledge Object patch completed:",
    count,
    "items updated"
  );

}