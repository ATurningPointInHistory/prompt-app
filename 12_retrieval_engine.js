/* ===============================
   FILE: 12_retrieval_engine.js
   Retrieval Engine v1
=============================== */

function findKnowledgeById(id) {
  buildKnowledgeRepository();
  return repositoryDatabase.byId[id] || null;
}

function findParentKnowledge(id) {
  buildKnowledgeRepository();

  return (repositoryDatabase.parents[id] || [])
    .map(parentId => repositoryDatabase.byId[parentId])
    .filter(Boolean);
}

function findChildKnowledge(id) {
  buildKnowledgeRepository();

  return (repositoryDatabase.children[id] || [])
    .map(childId => repositoryDatabase.byId[childId])
    .filter(Boolean);
}

function findPrerequisiteKnowledge(id) {

  buildKnowledgeRepository();

  const result = [];
  const visited = new Set();

  function visit(currentId) {

    if (visited.has(currentId)) {
      return;
    }

    visited.add(currentId);

    const parents =
      repositoryDatabase.parents[currentId] || [];

    parents.forEach(parentId =>
      visit(parentId)
    );

    const object =
      repositoryDatabase.byId[currentId];

    if (object) {
      result.push(object);
    }

  getDefaultPrerequisiteIds(id)
    .forEach(defaultId =>
      visit(defaultId)
    );

  visit(id);

  return result;
}

function findPrerequisiteKnowledge(id) {

  buildKnowledgeRepository();

  const result = [];
  const visited = new Set();

  function visit(currentId) {

    if (visited.has(currentId)) {
      return;
    }

    visited.add(currentId);

    const parents =
      repositoryDatabase.parents[currentId] || [];

    parents.forEach(parentId =>
      visit(parentId)
    );

    const object =
      repositoryDatabase.byId[currentId];

    if (object) {
      result.push(object);
    }

  }

  getDefaultPrerequisiteIds(id)
    .forEach(defaultId =>
      visit(defaultId)
    );

  visit(id);

  return result;

}

function findRelatedKnowledge(id) {

  const parents =
    findParentKnowledge(id);

  const children =
    findChildKnowledge(id);

  return [
    ...parents,
    ...children
  ];

}

function findKnowledgeBySeries(series) {

  buildKnowledgeRepository();

  return repositoryDatabase.objects.filter(object =>
    object.series === series
  );

}

function findKnowledgeByCategory(category) {

  buildKnowledgeRepository();

  return repositoryDatabase.objects.filter(object =>
    object.category === category
  );

}

function findKnowledgeByKeyword(keyword) {

  buildKnowledgeRepository();

  const q =
    String(keyword || "")
      .trim()
      .toLowerCase();

  if (!q) {
    return [];
  }

  return repositoryDatabase.objects.filter(object => {

    const text =
      [
        object.id,
        object.title,
        object.summary,
        object.series,
        object.category,
        object.knowledgeType,
        object.priority,
        object.status,
        object.version,
        ...(object.relationships || [])
      ]
        .join(" ")
        .toLowerCase();

    return text.includes(q);

  });

}

function getDefaultPrerequisiteIds(targetId) {

  const id =
    String(targetId || "");

  const defaults = [
    "VER-001",
    "DESIGN-000",
    "DESIGN-001",
    "DESIGN-002",
    "DESIGN-003",
    "CORE-001"
  ];

  if (
    /PLAT|PLATFORM|ARCH|DATABASE|KERNEL|ENGINE|REGISTRY|ORCHESTRATOR|INTENT|CONTEXT|RETRIEVAL/.test(id)
  ) {
    defaults.push(
      "PLAT-001",
      "ARCH-010"
    );
  }

  if (
    /DATABASE|KERNEL|ENGINE|REGISTRY|ORCHESTRATOR|INTENT|CONTEXT|RETRIEVAL/.test(id)
  ) {
    defaults.push(
      "DATABASE-001"
    );
  }

  if (
    /ENGINE|REGISTRY|ORCHESTRATOR|INTENT|CONTEXT|RETRIEVAL/.test(id)
  ) {
    defaults.push(
      "KERNEL-001"
    );
  }

  return defaults;

}

window.findKnowledgeById =
  findKnowledgeById;

window.findParentKnowledge =
  findParentKnowledge;

window.findChildKnowledge =
  findChildKnowledge;

window.findPrerequisiteKnowledge =
  findPrerequisiteKnowledge;

window.findImpactKnowledge =
  findImpactKnowledge;

window.findRelatedKnowledge =
  findRelatedKnowledge;

window.findKnowledgeBySeries =
  findKnowledgeBySeries;

window.findKnowledgeByCategory =
  findKnowledgeByCategory;

window.findKnowledgeByKeyword =
  findKnowledgeByKeyword;