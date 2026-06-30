/* ===============================
   12_document_parser.js
=============================== */

/* ===============================
   Document Header Parser System
=============================== */

function parseDocumentHeader(text) {

  const source =
    String(text || "");

  const headerMatch =
    source.match(
      /==================================================\s*Document Header\s*==================================================([\s\S]*?)(?==================================================)/i
    );

  const headerText =
    headerMatch
      ? headerMatch[1]
      : source;

  const metadata = {};

  const fieldPattern =
    /^([A-Za-z][A-Za-z0-9_ -]*):\s*([\s\S]*?)(?=^[A-Za-z][A-Za-z0-9_ -]*:\s*|\z)/gm;

  let match;

  while (
    (match = fieldPattern.exec(headerText)) !== null
  ) {

    const key =
      normalizeDocumentHeaderKey(
        match[1]
      );

    const value =
      String(match[2] || "")
        .trim();

    if (key) {
      metadata[key] = value;
    }

  }

  return metadata;

}

function normalizeDocumentHeaderKey(key) {

  const normalized =
    String(key || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");

  const map = {
    id: "id",
    title: "name",
    summary: "summary",
    series: "series",
    knowledgetype: "knowledgeType",
    category: "category",
    status: "status",
    priority: "priority",
    stability: "stability",
    decisionlevel: "decisionLevel",
    version: "version",
    created: "createdAt",
    updated: "updatedAt",
    tags: "keywords",
    relationships: "relationships"
  };

  return map[normalized] || "";

}

function applyDocumentHeaderToMemoEditor(text) {

  const metadata =
    parseDocumentHeader(text);

  if (!metadata || !Object.keys(metadata).length) {
    return;
  }

  setMemoEditorValue(
    "memoBoxKnowledgeId",
    metadata.id
  );

  setMemoEditorValue(
    "memoBoxName",
    metadata.name
  );

  setMemoEditorValue(
    "memoBoxSummary",
    metadata.summary
  );

  setMemoEditorValue(
    "memoBoxKnowledgeType",
    metadata.knowledgeType
  );

  setMemoEditorValue(
    "memoBoxCategory",
    metadata.category
  );

  setMemoEditorValue(
    "memoBoxPriority",
    metadata.priority
  );

  setMemoEditorValue(
    "memoBoxStability",
    metadata.stability
  );

  setMemoEditorValue(
    "memoBoxDecisionLevel",
    metadata.decisionLevel
  );

  setMemoEditorValue(
    "memoBoxVersion",
    metadata.version
  );

  setMemoEditorValue(
    "memoBoxSeries",
    metadata.series
  );

  if (metadata.status) {
    setMemoEditorValue(
      "memoBoxStatus",
      metadata.status
    );
  }

  if (metadata.keywords) {
    setMemoEditorValue(
      "memoBoxKeywords",
      metadata.keywords
    );
  }

  if (metadata.relationships) {
    setMemoEditorValue(
      "memoBoxRelationships",
      metadata.relationships
    );
  }

}

function setMemoEditorValue(id, value) {

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return;
  }

  const el =
    get(id);

  if (!el) {
    return;
  }

  el.value =
    String(value || "").trim();

}