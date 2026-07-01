/* ===============================
   FILE: 12_dependency_manager.js
   Knowledge Dependency Manager v1
=============================== */

const repositoryDatabase = {
  objects: [],
  byId: {},
  parents: {},
  children: {},
  roots: [],
  readOrder: [],
  duplicates: {}
};

function buildKnowledgeObjects() {

  const list =
    typeof getMemoBoxList === "function"
      ? getMemoBoxList()
      : JSON.parse(
          localStorage.getItem("memoBoxList") || "[]"
        );

  return list
    .map((memo, index) => ({

      index,

      id:
        memo.id ||
        extractKnowledgeIdFromTitle(memo.name) ||
        "",

      title:
        memo.name || "",

      summary:
        memo.summary || "",

      relationships:
        Array.isArray(memo.relationships)
          ? memo.relationships
          : [],

      series:
        memo.series || "",

      category:
        memo.category || "",

      knowledgeType:
        memo.knowledgeType || memo.type || "",

      priority:
        memo.priority || "",

      status:
        memo.status || "",

      version:
        memo.version || ""

    }))
    .filter(object => object.id);

}

function buildKnowledgeRepository() {

  repositoryDatabase.objects =
    buildKnowledgeObjects();

  buildKnowledgeIndexes();
  buildDependencyGraph();

  repositoryDatabase.roots =
    findRootKnowledgeObjects();

  repositoryDatabase.readOrder =
    sortKnowledgeObjects();

  return repositoryDatabase;

}

function buildKnowledgeIndexes() {

  repositoryDatabase.byId = {};
  repositoryDatabase.duplicates = {};

  repositoryDatabase.objects.forEach(object => {

    const current =
      repositoryDatabase.byId[object.id];

    if (!current) {
      repositoryDatabase.byId[object.id] = object;
      return;
    }

    if (!repositoryDatabase.duplicates[object.id]) {
      repositoryDatabase.duplicates[object.id] = [current];
    }

    repositoryDatabase.duplicates[object.id].push(object);

    repositoryDatabase.byId[object.id] =
      chooseBetterKnowledgeObject(
        current,
        object
      );

  });

  repositoryDatabase.objects =
    Object.values(repositoryDatabase.byId);

}

function chooseBetterKnowledgeObject(a, b) {

  return scoreKnowledgeObject(b) >
    scoreKnowledgeObject(a)
      ? b
      : a;

}

function scoreKnowledgeObject(object) {

  let score = 0;

  if (object.status === "Official") score += 50;
  if (object.summary) score += 20;
  if (object.relationships?.length) score += 20;
  if (object.series) score += 10;
  if (object.category) score += 10;
  if (object.version) score += 10;

  return score;

}

function buildDependencyGraph() {

  repositoryDatabase.parents = {};
  repositoryDatabase.children = {};

  repositoryDatabase.objects.forEach(object => {
    repositoryDatabase.parents[object.id] = [];
    repositoryDatabase.children[object.id] = [];
  });

  repositoryDatabase.objects.forEach(object => {

    object.relationships.forEach(parentId => {

      if (!repositoryDatabase.byId[parentId]) {
        return;
      }

      repositoryDatabase.parents[object.id].push(parentId);
      repositoryDatabase.children[parentId].push(object.id);

    });

  });

}

function findRootKnowledgeObjects() {

  return repositoryDatabase.objects
    .filter(object =>
      !repositoryDatabase.parents[object.id]?.length
    )
    .map(object => object.id);

}

function findChildKnowledgeObjects(id) {

  return repositoryDatabase.children[id] || [];

}

function getKnowledgeBaseOrder(object) {

  const text =
    `${object.id || ""} ${object.title || ""}`;

  if (/VER-/.test(text)) return 0;

  if (/DESIGN-000/.test(text)) return 10;
  if (/DESIGN-001/.test(text)) return 11;
  if (/DESIGN-002/.test(text)) return 12;
  if (/DESIGN-003/.test(text)) return 13;
  if (/AI Scalability/i.test(text)) return 14;

  if (/CORE-/.test(text)) return 20;
  if (/PLATFORM-|PLAT-/.test(text)) return 30;

  if (/ARCHITECTURE-|ARCH-/.test(text)) return 40;
  if (/DATABASE-/.test(text)) return 45;

  if (/KERNEL-/.test(text)) return 50;
  if (/ENGINE-/.test(text)) return 60;

  if (/ORCHESTRATOR-/.test(text)) return 70;
  if (/INTENT-/.test(text)) return 71;
  if (/CONTEXT-/.test(text)) return 72;
  if (/RETRIEVAL-/.test(text)) return 73;

  if (/REGISTRY-/.test(text)) return 80;

  if (/DOCUMENT-/.test(text)) return 90;
  if (/KNOWLEDGE-|KNOW-/.test(text)) return 91;
  if (/META-/.test(text)) return 92;

  if (/MGR-|MANAGER-/.test(text)) return 100;
  if (/BUILDER-/.test(text)) return 101;
  if (/REPOSITORY-/.test(text)) return 102;

  if (/RULE-/.test(text)) return 110;
  if (/WORK-/.test(text)) return 111;
  if (/GUIDE-/.test(text)) return 112;
  if (/PLUG-/.test(text)) return 113;
  if (/ANLY-/.test(text)) return 114;

  return 999;

}

function sortKnowledgeObjects() {

  return repositoryDatabase.objects
    .slice()
    .sort((a, b) => {

      const orderA =
        getKnowledgeBaseOrder(a);

      const orderB =
        getKnowledgeBaseOrder(b);

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return String(a.id || "")
        .localeCompare(String(b.id || ""));

    })
    .map(object => object.id);

}

function buildKnowledgeReadOrder() {

  buildKnowledgeRepository();

  const lines = [];

  lines.push("==================================");
  lines.push("AI Read Order");
  lines.push("==================================");
  lines.push("");

  repositoryDatabase.readOrder.forEach((id, index) => {

    const object =
      repositoryDatabase.byId[id];

    lines.push(
      `${String(index + 1).padStart(2, "0")} ${id} ${object?.title || ""}`
    );

  });

  return lines.join("\n");

}

function showKnowledgeReadOrder() {

  const text =
    buildKnowledgeReadOrder();

  openFloatPanel(
    "AI Read Order",
    `
<div class="memo-actions">
  <button onclick="copyKnowledgeReadOrder()">
    📋コピー
  </button>
</div>

<pre class="code-preview">
${escapeHtml(text)}
</pre>
`
  );

}

function copyKnowledgeReadOrder() {

  copyTextFallback(
    buildKnowledgeReadOrder()
  );

}

function extractKnowledgeIdFromTitle(title) {

  const match =
    String(title || "").match(
      /[A-Z][A-Z0-9_]*-\d+/
    );

  return match ? match[0] : "";

}

function buildKnowledgeTree() {

  buildKnowledgeRepository();

  const lines = [];

  lines.push("==================================");
  lines.push("Knowledge Dependency Tree");
  lines.push("==================================");
  lines.push("");

  repositoryDatabase.roots.forEach(id => {
    appendKnowledgeTreeLine(
      lines,
      id,
      0,
      new Set()
    );
  });

  return lines.join("\n");

}

function appendKnowledgeTreeLine(
  lines,
  id,
  depth,
  visited
) {

  const object =
    repositoryDatabase.byId[id];

  if (!object) {
    return;
  }

  const indent =
    "  ".repeat(depth);

  lines.push(
    `${indent}${depth ? "└─ " : ""}${id} ${object.title || ""}`
  );

  if (visited.has(id)) {
    lines.push(
      `${indent}  ⚠ circular reference`
    );
    return;
  }

  visited.add(id);

  const children =
    repositoryDatabase.children[id] || [];

  children.forEach(childId => {
    appendKnowledgeTreeLine(
      lines,
      childId,
      depth + 1,
      new Set(visited)
    );
  });

}

function showKnowledgeTree() {

  const text =
    buildKnowledgeTree();

  openFloatPanel(
    "Knowledge Tree",
    `
<div class="memo-actions">
  <button onclick="copyKnowledgeTree()">
    📋コピー
  </button>
</div>

<pre class="code-preview">
${escapeHtml(text)}
</pre>
`
  );

}

function copyKnowledgeTree() {

  copyTextFallback(
    buildKnowledgeTree()
  );

}

function findMissingKnowledgeObjects() {

  buildKnowledgeRepository();

  const missing = [];

  repositoryDatabase.objects.forEach(object => {

    object.relationships.forEach(id => {

      if (!repositoryDatabase.byId[id]) {
        missing.push({
          from: object.id,
          missing: id
        });
      }

    });

  });

  return missing;

}

function buildKnowledgeHealthReport() {

  buildKnowledgeRepository();

  const missing =
    findMissingKnowledgeObjects();

  const duplicateIds =
    Object.keys(
      repositoryDatabase.duplicates || {}
    );

  const lines = [];

  lines.push("==================================");
  lines.push("Repository Health");
  lines.push("==================================");
  lines.push("");

  lines.push(
    `Knowledge Objects : ${repositoryDatabase.objects.length}`
  );

  lines.push(
    `Root Objects      : ${repositoryDatabase.roots.length}`
  );

  lines.push(
    `Duplicate IDs     : ${duplicateIds.length}`
  );

  lines.push(
    `Missing IDs       : ${missing.length}`
  );

  lines.push("");

  if (duplicateIds.length) {
    lines.push("Duplicate IDs");
    lines.push("----------------------------------");

    duplicateIds.forEach(id => {
      lines.push(id);
    });

    lines.push("");
  }

  if (missing.length) {
    lines.push("Missing Relationships");
    lines.push("----------------------------------");

    missing.forEach(item => {
      lines.push(
        `${item.from} -> ${item.missing}`
      );
    });

    lines.push("");
  }

  return lines.join("\n");

}

function showKnowledgeHealthReport() {

  const text =
    buildKnowledgeHealthReport();

  openFloatPanel(
    "Repository Health",
    `
<div class="memo-actions">
  <button onclick="copyKnowledgeHealthReport()">
    📋コピー
  </button>
</div>

<pre class="code-preview">
${escapeHtml(text)}
</pre>
`
  );

}

function copyKnowledgeHealthReport() {

  copyTextFallback(
    buildKnowledgeHealthReport()
  );

}

window.repositoryDatabase = repositoryDatabase;
window.buildKnowledgeObjects = buildKnowledgeObjects;
window.buildKnowledgeRepository = buildKnowledgeRepository;
window.buildKnowledgeIndexes = buildKnowledgeIndexes;
window.buildDependencyGraph = buildDependencyGraph;
window.findRootKnowledgeObjects = findRootKnowledgeObjects;
window.findChildKnowledgeObjects = findChildKnowledgeObjects;
window.getKnowledgeBaseOrder = getKnowledgeBaseOrder;
window.sortKnowledgeObjects = sortKnowledgeObjects;
window.buildKnowledgeReadOrder = buildKnowledgeReadOrder;
window.showKnowledgeReadOrder = showKnowledgeReadOrder;
window.copyKnowledgeReadOrder = copyKnowledgeReadOrder;
window.buildKnowledgeTree =
  buildKnowledgeTree;
window.showKnowledgeTree =
  showKnowledgeTree;
window.copyKnowledgeTree =
  copyKnowledgeTree;
window.findMissingKnowledgeObjects =
  findMissingKnowledgeObjects;
window.buildKnowledgeHealthReport =
  buildKnowledgeHealthReport;
window.showKnowledgeHealthReport =
  showKnowledgeHealthReport;
window.copyKnowledgeHealthReport =
  copyKnowledgeHealthReport;