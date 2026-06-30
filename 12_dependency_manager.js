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
      : JSON.parse(
          localStorage.getItem("memoBoxList") || "[]"
        );

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

  repositoryDatabase.duplicates = {};

  repositoryDatabase.objects.forEach(object => {

    const id =
      object.id;

    if (!id) {
      return;
    }

    const current =
      repositoryDatabase.byId[id];

    if (!current) {

      repositoryDatabase.byId[id] =
        object;

      return;

    }

    if (
      !repositoryDatabase.duplicates[id]
    ) {
      repositoryDatabase.duplicates[id] = [
        current
      ];
    }

    repositoryDatabase.duplicates[id]
      .push(object);

    repositoryDatabase.byId[id] =
      chooseBetterKnowledgeObject(
        current,
        object
      );

  });

  repositoryDatabase.objects =
    Object.values(
      repositoryDatabase.byId
    );

}

function chooseBetterKnowledgeObject(
  a,
  b
) {

  const scoreA =
    scoreKnowledgeObject(a);

  const scoreB =
    scoreKnowledgeObject(b);

  return scoreB > scoreA
    ? b
    : a;

}

function scoreKnowledgeObject(object) {

  let score = 0;

  if (object.status === "Official") {
    score += 50;
  }

  if (object.summary) {
    score += 20;
  }

  if (object.relationships?.length) {
    score += 20;
  }

  if (object.series) {
    score += 10;
  }

  if (object.category) {
    score += 10;
  }

  if (object.version) {
    score += 10;
  }

  return score;

}

function getKnowledgeBaseOrder(object) {

  const id =
    object.id || "";

  const title =
    object.title || "";

  const text =
    id + " " + title;

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

  if

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