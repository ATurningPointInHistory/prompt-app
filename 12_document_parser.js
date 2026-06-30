/* ===============================
   FILE: 12_document_parser.js
   Document Parser System
=============================== */

function parseDocumentHeader(text) {

  const source =
    String(text || "");

  const header =
    extractDocumentHeaderBlock(
      source
    );

  const metadata = {};

  const lines =
    header.split(/\r?\n/);

  let currentKey = "";

  lines.forEach(line => {

    const match =
      line.match(
        /^([A-Za-z][A-Za-z0-9_ -]*):\s*(.*)$/
      );

    if (match) {

      currentKey =
        normalizeDocumentHeaderKey(
          match[1]
        );

      if (currentKey) {

        metadata[currentKey] =
          cleanDocumentHeaderValue(
            match[2]
          );

      }

      return;

    }

    if (
      currentKey &&
      line.trim()
    ) {

      metadata[currentKey] =
        cleanDocumentHeaderValue(
          metadata[currentKey] +
          "\n" +
          line.trim()
        );

    }

  });

  metadata.keywords =
    splitDocumentCsv(
      metadata.keywords
    );

  metadata.relationships =
    splitDocumentCsv(
      metadata.relationships
    );

  return metadata;

}

function cleanDocumentHeaderValue(
  value
) {

  return String(value || "")
    .replace(/^\s+/, "")
    .replace(/\s+$/, "");

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
    keywords: "keywords",
    relationships: "relationships"
  };

  return map[normalized] || "";

}

function splitDocumentCsv(value) {

  if (Array.isArray(value)) {
    return value;
  }

  return String(value || "")
    .split(",")
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