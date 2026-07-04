/* ===============================
   FILE: 12_document_parser.js
   Document Parser System
=============================== */

function parseLinePairDocumentHeader(header) {

  const metadata = {};

  const lines =
    String(header || "")
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line =>
        line &&
        !/^-+$/.test(line) &&
        !/^=+$/.test(line)
      );

  const metadataKeys =
    new Set([
      "id",
      "title",
      "summary",
      "version",
      "layer",
      "category",
      "knowledgetype",
      "status",
      "priority",
      "stability",
      "keywords",
      "tags",
      "relationships",
      "workflow",
      "rules",
      "owner",
      "created",
      "updated",
      "decisionlevel"
    ]);

  for (
    let i = 0;
    i < lines.length;
    i++
  ) {

    const raw =
      lines[i];

    const key =
      raw
        .toLowerCase()
        .replace(/\s+/g, "");

    if (!metadataKeys.has(key)) {
      continue;
    }

    const normalizedKey =
      normalizeDocumentHeaderKey(raw);

    if (!normalizedKey) {
      continue;
    }

    const values = [];

    let j =
      i + 1;

    for (
      ;
      j < lines.length;
      j++
    ) {

      const next =
        lines[j];

      const nextKey =
        next
          .toLowerCase()
          .replace(/\s+/g, "");

      if (
        metadataKeys.has(nextKey)
      ) {
        break;
      }

      values.push(next);

    }

    const parsedValue =
      parseMetadataValue(
        normalizedKey,
        values
      );

    if (
      parsedValue ||
      metadata[normalizedKey] === undefined
    ) {
      metadata[normalizedKey] =
        parsedValue;
    }

    i =
      j - 1;

  }

  return metadata;

}

function cleanDocumentHeaderValue(
  value
) {

  return String(value || "")
    .replace(/^\s+/, "")
    .replace(/\s+$/, "");

}

function parseColonDocumentHeader(header) {

  const metadata = {};

  const lines =
    String(header || "")
      .split(/\r?\n/);

  let currentKey = "";

  lines.forEach(line => {

    const keyMatch =
      line.match(
        /^([A-Za-z][A-Za-z0-9_ -]*):\s*(.*)$/
      );

    if (keyMatch) {

      currentKey =
        normalizeDocumentHeaderKey(
          keyMatch[1]
        );

      if (currentKey) {

        metadata[currentKey] =
          cleanDocumentHeaderValue(
            keyMatch[2] || ""
          );

      }

      return;

    }

    if (
      currentKey &&
      line.trim()
    ) {

      const currentValue =
        metadata[currentKey] || "";

      metadata[currentKey] =
        cleanDocumentHeaderValue(
          currentValue
            ? currentValue + "\n" + line.trim()
            : line.trim()
        );

    }

  });

  return metadata;

}

function extractDocumentHeaderBlock(text) {

  const source =
    String(text || "");

  const match =
    source.match(
      /==================================================\s*Document Header\s*==================================================([\s\S]*?)(?==================================================|$)/i
    );

  return match
    ? match[1].trim()
    : source;

}

function extractMetadataBlock(text) {

  const lines =
    String(text || "")
      .split(/\r?\n/);

  let start = -1;
  let end = lines.length;

  for (
    let i = 0;
    i < lines.length;
    i++
  ) {

    const line =
      lines[i].trim();

    if (
      /^metadata$/i.test(line)
    ) {
      start = i + 1;
      continue;
    }

    if (
      start >= 0 &&
      /^body$/i.test(line)
    ) {
      end = i;
      break;
    }

  }

  if (start < 0) {
    return text;
  }

  return lines
    .slice(start, end)
    .join("\n");

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
    version: "version",
    layer: "layer",
    series: "series",
    knowledgetype: "knowledgeType",
    category: "category",
    status: "status",
    priority: "priority",
    stability: "stability",
    decisionlevel: "decisionLevel",
    created: "createdAt",
    updated: "updatedAt",
    tags: "keywords",
    keywords: "keywords",
    relationships: "relationships",
    workflow: "workflow",
    rules: "rules",
    owner: "owner"
  };

  return map[normalized] || "";

}

function parseMetadataValue(
  key,
  values
) {

  const list =
    Array.isArray(values)
      ? values
      : [];

  const text =
    list.join("\n").trim();

  if (key === "version") {
    return (
      list.find(v =>
        /^\d+(\.\d+)*$/.test(v)
      ) || ""
    );
  }

  if (key === "id") {
    return (
      list.find(v =>
        /^[A-Z][A-Z0-9_-]*-\d+$/.test(v)
      ) || list[0] || ""
    );
  }

  if (
    [
      "name",
      "layer",
      "category",
      "knowledgeType",
      "status",
      "priority",
      "stability",
      "decisionLevel",
      "owner",
      "createdAt",
      "updatedAt"
    ].includes(key)
  ) {
    return list[0] || "";
  }

  return text;

}

function splitDocumentCsv(value) {

  if (Array.isArray(value)) {
    return value
      .flatMap(item =>
        String(item || "")
          .split(/,|\r?\n/)
      )
      .map(v => v.trim())
      .filter(Boolean);
  }

  return String(value || "")
    .split(/,|\r?\n/)
    .map(v => v.trim())
    .filter(Boolean);

}

function testDocumentHeaderParser() {

  const sample = `
==================================================
Document Header
==================================================

ID:
DOCUMENT-001

Title:
Document Header Specification

Summary:
Defines the standard metadata header format.

Series:
DOCUMENT

KnowledgeType:
Specification

Category:
Document

Status:
Draft

Priority:
High

Stability:
Stable

DecisionLevel:
Approved

Version:
1.0

Created:
2026-06-30

Updated:
2026-06-30

Tags:
Document, Header, Metadata

Relationships:
DOCUMENT-000, KNOWLEDGE-001

==================================================
Purpose
==================================================

Test body.
`;

  const result =
    parseDocumentHeader(sample);

  console.log(
    "Document Header Parser Test",
    result
  );

  return result;

}

window.parseDocumentHeader =
  parseDocumentHeader;

window.extractDocumentHeaderBlock =
  extractDocumentHeaderBlock;

window.normalizeDocumentHeaderKey =
  normalizeDocumentHeaderKey;

window.splitDocumentCsv =
  splitDocumentCsv;

window.testDocumentHeaderParser =
  testDocumentHeaderParser;

window.extractMetadataBlock =
  extractMetadataBlock;

window.parseLinePairDocumentHeader =
  parseLinePairDocumentHeader;

window.parseColonDocumentHeader =
  parseColonDocumentHeader;