/* ===============================
   FILE: 14_architecture_database.js
   Architecture Object Database v1
=============================== */

let architectureDatabase =
  loadJson(
    "architectureDatabase",
    {
      version: "1.0.0",
      objects: {},
      relationships: [],
      indexes: {},
      statistics: {}
    }
  );

/* ===============================
   Save
=============================== */

function saveArchitectureDatabase() {

  localStorage.setItem(
    "architectureDatabase",
    JSON.stringify(
      architectureDatabase
    )
  );

}

/* ===============================
   Normalize
=============================== */

function normalizeArchitectureObject(
  object = {}
) {

  const now =
    new Date().toISOString();

  return {
    id:
      object.id ||
      `OBJ-${Date.now()}`,

    type:
      object.type ||
      "Knowledge",

    title:
      object.title ||
      "Untitled Object",

    summary:
      object.summary ||
      "",

    description:
      object.description ||
      "",

    version:
      object.version ||
      "1.0.0",

    status:
      object.status ||
      "Active",

    priority:
      object.priority ||
      "Normal",

    layer:
      object.layer ||
      "Unknown",

    category:
      object.category ||
      "General",

    tags:
      Array.isArray(object.tags)
        ? object.tags
        : [],

    metadata:
      object.metadata || {},

    createdAt:
      object.createdAt ||
      now,

    updatedAt:
      now
  };

}

/* ===============================
   Register Object
=============================== */

function registerArchitectureObject(
  object = {},
  options = {}
) {

  const item =
    normalizeArchitectureObject(
      object
    );

  architectureDatabase.objects[
    item.id
  ] = item;

  if (
    options.rebuild !== false
  ) {
    rebuildArchitectureIndexes();
  }

  if (
    options.save !== false
  ) {
    saveArchitectureDatabase();
  }

  return item;

}

/* ===============================
   Get Object
=============================== */

function getArchitectureObject(
  id
) {

  return architectureDatabase
    .objects?.[id] || null;

}

/* ===============================
   Search Objects
=============================== */

function searchArchitectureObjects(
  keyword = ""
) {

  const q =
    String(keyword || "")
      .trim()
      .toLowerCase();

  const list =
    Object.values(
      architectureDatabase.objects || {}
    );

  if (!q) {
    return list;
  }

  return list.filter(item => {

    const text =
      [
        item.id,
        item.type,
        item.title,
        item.summary,
        item.description,
        item.category,
        item.layer,
        item.status,
        item.priority,
        ...(item.tags || [])
      ]
        .join(" ")
        .toLowerCase();

    return text.includes(q);

  });

}

/* ===============================
   Relationship
=============================== */

function addArchitectureRelationship(
  source,
  target,
  type = "RelatedTo",
  reason = "",
  options = {}
) {

  if (!source || !target) {
    return null;
  }

  const exists =
    architectureDatabase.relationships
      .some(rel =>
        rel.source === source &&
        rel.target === target &&
        rel.type === type
      );

  if (exists) {
    return null;
  }

  const rel = {
    source,
    target,
    type,
    reason,
    createdAt:
      new Date().toISOString()
  };

  architectureDatabase.relationships
    .push(rel);

  if (
    options.rebuild !== false
  ) {
    rebuildArchitectureIndexes();
  }

  if (
    options.save !== false
  ) {
    saveArchitectureDatabase();
  }

  return rel;

}

/* ===============================
   Related Objects
=============================== */

function getRelatedArchitectureObjects(
  id
) {

  const relationships =
    architectureDatabase.relationships
      .filter(rel =>
        rel.source === id ||
        rel.target === id
      );

  return relationships.map(rel => {

    const otherId =
      rel.source === id
        ? rel.target
        : rel.source;

    return {
      relationship: rel,
      object:
        getArchitectureObject(otherId)
    };

  });

}

/* ===============================
   Rebuild Indexes
=============================== */

function rebuildArchitectureIndexes() {

  const objects =
    Object.values(
      architectureDatabase.objects || {}
    );

  const indexes = {
    type: {},
    layer: {},
    category: {},
    status: {},
    priority: {},
    tag: {}
  };

  objects.forEach(item => {

    addArchitectureIndex(
      indexes.type,
      item.type,
      item.id
    );

    addArchitectureIndex(
      indexes.layer,
      item.layer,
      item.id
    );

    addArchitectureIndex(
      indexes.category,
      item.category,
      item.id
    );

    addArchitectureIndex(
      indexes.status,
      item.status,
      item.id
    );

    addArchitectureIndex(
      indexes.priority,
      item.priority,
      item.id
    );

    (item.tags || []).forEach(tag =>
      addArchitectureIndex(
        indexes.tag,
        tag,
        item.id
      )
    );

  });

  architectureDatabase.indexes =
    indexes;

  architectureDatabase.statistics = {
    objectCount:
      objects.length,

    relationshipCount:
      architectureDatabase.relationships.length,

    updatedAt:
      new Date().toISOString()
  };

}

/* ===============================
   Add Index
=============================== */

function addArchitectureIndex(
  index,
  key,
  id
) {

  const k =
    String(key || "Unknown");

  if (!index[k]) {
    index[k] = [];
  }

  if (!index[k].includes(id)) {
    index[k].push(id);
  }

}

/* ===============================
   Build Report
=============================== */

function buildArchitectureDatabaseReport() {

  rebuildArchitectureIndexes();

  const stats =
    architectureDatabase.statistics;

  const lines = [];

  lines.push("ARCHITECTURE DATABASE");
  lines.push("");
  lines.push("=== Statistics ===");
  lines.push(`Objects: ${stats.objectCount}`);
  lines.push(`Relationships: ${stats.relationshipCount}`);
  lines.push("");
  lines.push("=== Types ===");

  Object.keys(
    architectureDatabase.indexes.type || {}
  ).forEach(type => {
    lines.push(
      `${type}: ${
        architectureDatabase.indexes.type[type].length
      }`
    );
  });

  return lines.join("\n");

}

/* ===============================
   Show Report
=============================== */

function showArchitectureDatabase() {

  const report =
    buildArchitectureDatabaseReport();

  openFloatPanel(
    "Architecture Database",
    `
<pre class="code-preview">${escapeHtml(report)}</pre>
<button onclick="copyArchitectureDatabaseReport()">
📋 コピー
</button>
`
  );

}

/* ===============================
   Copy Report
=============================== */

function copyArchitectureDatabaseReport() {

  copyTextFallback(
    buildArchitectureDatabaseReport()
  );

}

/* ===============================
   Export
=============================== */

function exportArchitectureDatabase() {

  downloadJsonFile(
    architectureDatabase,
    "architecture_database.json"
  );

}

/* ===============================
   Global Export
=============================== */

window.registerArchitectureObject =
  registerArchitectureObject;

window.getArchitectureObject =
  getArchitectureObject;

window.searchArchitectureObjects =
  searchArchitectureObjects;

window.addArchitectureRelationship =
  addArchitectureRelationship;

window.getRelatedArchitectureObjects =
  getRelatedArchitectureObjects;

window.rebuildArchitectureIndexes =
  rebuildArchitectureIndexes;

window.buildArchitectureDatabaseReport =
  buildArchitectureDatabaseReport;

window.showArchitectureDatabase =
  showArchitectureDatabase;

window.copyArchitectureDatabaseReport =
  copyArchitectureDatabaseReport;

window.exportArchitectureDatabase =
  exportArchitectureDatabase;