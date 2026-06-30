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

  readOrder: []

};

/* ===============================
   Build
=============================== */

function buildKnowledgeObjects() {

  const list =
    typeof getMemoBoxList === "function"
      ? getMemoBoxList()
      : [];

  return list
    .map((memo, index) => ({

      index,

      id:
        memo.id ||
        extractKnowledgeIdFromTitle(
          memo.name
        ) ||
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
        memo.knowledgeType ||
        memo.type ||
        "",

      priority:
        memo.priority || "",

      status:
        memo.status || "",

      version:
        memo.version || ""

    }))
    .filter(object =>
      object.id
    );

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

  repositoryDatabase.objects.forEach(object => {

    repositoryDatabase.byId[
      object.id
    ] = object;

  });

}

/* ===============================
   Dependency
=============================== */

function buildDependencyGraph() {

  repositoryDatabase.parents = {};
  repositoryDatabase.children = {};

  repositoryDatabase.objects.forEach(object => {

    repositoryDatabase.parents[
      object.id
    ] = [];

    repositoryDatabase.children[
      object.id
    ] = [];

  });

  repositoryDatabase.objects.forEach(object => {

    object.relationships.forEach(parentId => {

      if (
        !repositoryDatabase.byId[parentId]
      ) {
        return;
      }

      repositoryDatabase.parents[
        object.id
      ].push(parentId);

      repositoryDatabase.children[
        parentId
      ].push(object.id);

    });

  });

}

function findRootKnowledgeObjects() {

  return repositoryDatabase.objects
    .filter(object =>
      !repositoryDatabase.parents[
        object.id
      ]?.length
    )
    .map(object =>
      object.id
    );

}

function findChildKnowledgeObjects(id) {

  return (
    repositoryDatabase.children[id] || []
  );

}

/* ===============================
   Sort
=============================== */

function sortKnowledgeObjects() {

  const visited =
    new Set();

  const result = [];

  function visit(id) {

    if (visited.has(id)) {
      return;
    }

    visited.add(id);

    const children =
      repositoryDatabase.children[id] || [];

    result.push(id);

    children.forEach(childId =>
      visit(childId)
    );

  }

  repositoryDatabase.roots.forEach(id =>
    visit(id)
  );

  repositoryDatabase.objects.forEach(object =>
    visit(object.id)
  );

  return result;

}

/* ===============================
   Output
=============================== */

function buildKnowledgeReadOrder() {

  buildKnowledgeRepository();

  const lines = [];

  lines.push(
    "=================================="
  );
  lines.push(
    "AI Read Order"
  );
  lines.push(
    "=================================="
  );
  lines.push("");

  repositoryDatabase.readOrder.forEach(
    (id, index) => {

      const object =
        repositoryDatabase.byId[id];

      lines.push(
        `${String(index + 1).padStart(2, "0")} ${id} ${object?.title || ""}`
      );

    }
  );

  return lines.join("\n");

}

function showKnowledgeReadOrder() {

  const text =
    buildKnowledgeReadOrder();

  if (
    typeof openFloatPanel === "function"
  ) {

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

    return;

  }

  alert(text);

}

function copyKnowledgeReadOrder() {

  const text =
    buildKnowledgeReadOrder();

  copyTextFallback(text);

}

/* ===============================
   Utility
=============================== */

function extractKnowledgeIdFromTitle(title) {

  const match =
    String(title || "").match(
      /[A-Z][A-Z0-9_]*-\d+/
    );

  return match
    ? match[0]
    : "";

}

/* ===============================
   Global Export
=============================== */

window.repositoryDatabase =
  repositoryDatabase;

window.buildKnowledgeObjects =
  buildKnowledgeObjects;

window.buildKnowledgeRepository =
  buildKnowledgeRepository;

window.buildKnowledgeIndexes =
  buildKnowledgeIndexes;

window.buildDependencyGraph =
  buildDependencyGraph;

window.findRootKnowledgeObjects =
  findRootKnowledgeObjects;

window.findChildKnowledgeObjects =
  findChildKnowledgeObjects;

window.sortKnowledgeObjects =
  sortKnowledgeObjects;

window.buildKnowledgeReadOrder =
  buildKnowledgeReadOrder;

window.showKnowledgeReadOrder =
  showKnowledgeReadOrder;

window.copyKnowledgeReadOrder =
  copyKnowledgeReadOrder;