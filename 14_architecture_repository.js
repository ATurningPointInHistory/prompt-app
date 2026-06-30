/* ===============================
   FILE: 14_architecture_Repository.js
   Read Only Layer
=============================== */

/* ===============================
   Get Architecture Database
=============================== */

function getArchitectureDatabase() {

  if (
    typeof architectureDatabase !== "undefined" &&
    architectureDatabase
  ) {
    return architectureDatabase;
  }

  if (
    window.architectureDatabase
  ) {
    return window.architectureDatabase;
  }

  return {
    version: "",
    objects: {},
    relationships: [],
    indexes: {},
    statistics: {
      objectCount: 0,
      relationshipCount: 0,
      updatedAt: ""
    }
  };

}

/* ===============================
   Repository Match Utility
=============================== */

function matchArchitectureValue(
  actual,
  expected
) {

  if (!expected) {
    return true;
  }

  return String(actual || "")
    .toLowerCase() ===
    String(expected || "")
      .toLowerCase();

}

function matchArchitectureTags(
  tags,
  expected
) {

  if (!expected) {
    return true;
  }

  if (!Array.isArray(tags)) {
    return false;
  }

  return tags.some(tag =>
    String(tag || "")
      .toLowerCase() ===
    String(expected || "")
      .toLowerCase()
  );

}

/* ===============================
   Object Repository
=============================== */

function findArchitectureObject(
  id
) {

  const database =
    getArchitectureDatabase();

  if (!id) {
    return null;
  }

  return database.objects?.[id] || null;

}

function findArchitectureObjects(
  filter = {}
) {

  const database =
    getArchitectureDatabase();

  const objects =
    Object.values(
      database.objects || {}
    );

  return objects.filter(object => {

    if (
      !matchArchitectureValue(
        object.type,
        filter.type
      )
    ) {
      return false;
    }

    if (
      !matchArchitectureValue(
        object.category,
        filter.category
      )
    ) {
      return false;
    }

    if (
      !matchArchitectureValue(
        object.layer,
        filter.layer
      )
    ) {
      return false;
    }

    if (
      !matchArchitectureValue(
        object.status,
        filter.status
      )
    ) {
      return false;
    }

    if (
      !matchArchitectureValue(
        object.priority,
        filter.priority
      )
    ) {
      return false;
    }

    if (
      !matchArchitectureTags(
        object.tags,
        filter.tag
      )
    ) {
      return false;
    }

    return true;

  });

}

function findArchitectureObjectsByType(
  type
) {

  return findArchitectureObjects({
    type
  });

}

function findArchitectureObjectsByCategory(
  category
) {

  return findArchitectureObjects({
    category
  });

}

function findArchitectureObjectsByLayer(
  layer
) {

  return findArchitectureObjects({
    layer
  });

}

function findArchitectureObjectsByTag(
  tag
) {

  return findArchitectureObjects({
    tag
  });

}

/* ===============================
   Relationship Repository
=============================== */

function getArchitectureRelationships() {

  const database =
    getArchitectureDatabase();

  const relationships =
    database.relationships || [];

  if (
    Array.isArray(relationships)
  ) {
    return relationships;
  }

  return Object.values(
    relationships
  );

}

function findArchitectureRelationships(
  filter = {}
) {

  return getArchitectureRelationships()
    .filter(relationship => {

      if (
        !matchArchitectureValue(
          relationship.source,
          filter.source
        )
      ) {
        return false;
      }

      if (
        !matchArchitectureValue(
          relationship.target,
          filter.target
        )
      ) {
        return false;
      }

      if (
        !matchArchitectureValue(
          relationship.type,
          filter.type
        )
      ) {
        return false;
      }

      return true;

    });

}

function findArchitectureChildren(
  source
) {

  return findArchitectureRelationships({
    source
  });

}

function findArchitectureParents(
  target
) {

  return findArchitectureRelationships({
    target
  });

}

function findArchitectureCalls(
  source
) {

  return findArchitectureRelationships({
    source,
    type: "calls"
  });

}

function findArchitectureCalledBy(
  target
) {

  return findArchitectureRelationships({
    target,
    type: "calls"
  });

}

/* ===============================
   Existence / Count / Statistics
=============================== */

function existsArchitectureObject(
  id
) {

  return !!findArchitectureObject(
    id
  );

}

function countArchitectureObjects(
  filter = {}
) {

  return findArchitectureObjects(
    filter
  ).length;

}

function countArchitectureRelationships(
  filter = {}
) {

  return findArchitectureRelationships(
    filter
  ).length;

}

function getArchitectureStatistics() {

  const database =
    getArchitectureDatabase();

  return database.statistics || {
    objectCount:
      countArchitectureObjects(),

    relationshipCount:
      countArchitectureRelationships(),

    updatedAt:
      ""
  };

}

/* ===============================
   Architecture Repository Search
=============================== */

function normalizeArchitectureSearchText(
  value
) {

  return String(value || "")
    .toLowerCase();

}

function stringifyArchitectureSearchValue(
  value
) {

  if (
    value === null ||
    typeof value === "undefined"
  ) {
    return "";
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (
    Array.isArray(value)
  ) {
    return value
      .map(item =>
        stringifyArchitectureSearchValue(
          item
        )
      )
      .join(" ");
  }

  if (
    typeof value === "object"
  ) {
    return Object.values(value)
      .map(item =>
        stringifyArchitectureSearchValue(
          item
        )
      )
      .join(" ");
  }

  return "";

}

function buildArchitectureObjectSearchText(
  object = {}
) {

  return normalizeArchitectureSearchText(
    [
      object.id,
      object.type,
      object.title,
      object.summary,
      object.description,
      object.version,
      object.status,
      object.priority,
      object.layer,
      object.category,
      stringifyArchitectureSearchValue(
        object.tags
      ),
      stringifyArchitectureSearchValue(
        object.metadata
      )
    ].join(" ")
  );

}

/* ===============================
   Search Objects
=============================== */

function searchArchitectureObjects(
  keyword = "",
  options = {}
) {

  const word =
    normalizeArchitectureSearchText(
      keyword
    ).trim();

  if (!word) {
    return [];
  }

  const objects =
    findArchitectureObjects(
      options.filter || {}
    );

  const limit =
    Number(options.limit || 100);

  return objects
    .filter(object =>
      buildArchitectureObjectSearchText(
        object
      ).includes(word)
    )
    .slice(0, limit);

}

function searchArchitectureObjectsByType(
  keyword = "",
  type = "",
  options = {}
) {

  return searchArchitectureObjects(
    keyword,
    {
      ...options,
      filter: {
        ...(options.filter || {}),
        type
      }
    }
  );

}

function searchArchitectureObjectsByLayer(
  keyword = "",
  layer = "",
  options = {}
) {

  return searchArchitectureObjects(
    keyword,
    {
      ...options,
      filter: {
        ...(options.filter || {}),
        layer
      }
    }
  );

}

/* ===============================
   Global Export
=============================== */

window.getArchitectureDatabase =
  getArchitectureDatabase;

window.matchArchitectureValue =
  matchArchitectureValue;

window.matchArchitectureTags =
  matchArchitectureTags;

window.findArchitectureObject =
  findArchitectureObject;

window.findArchitectureObjects =
  findArchitectureObjects;

window.findArchitectureObjectsByType =
  findArchitectureObjectsByType;

window.findArchitectureObjectsByCategory =
  findArchitectureObjectsByCategory;

window.findArchitectureObjectsByLayer =
  findArchitectureObjectsByLayer;

window.findArchitectureObjectsByTag =
  findArchitectureObjectsByTag;

window.getArchitectureRelationships =
  getArchitectureRelationships;

window.findArchitectureRelationships =
  findArchitectureRelationships;

window.findArchitectureChildren =
  findArchitectureChildren;

window.findArchitectureParents =
  findArchitectureParents;

window.findArchitectureCalls =
  findArchitectureCalls;

window.findArchitectureCalledBy =
  findArchitectureCalledBy;

window.existsArchitectureObject =
  existsArchitectureObject;

window.countArchitectureObjects =
  countArchitectureObjects;

window.countArchitectureRelationships =
  countArchitectureRelationships;

window.getArchitectureStatistics =
  getArchitectureStatistics;

window.normalizeArchitectureSearchText =
  normalizeArchitectureSearchText;

window.stringifyArchitectureSearchValue =
  stringifyArchitectureSearchValue;

window.buildArchitectureObjectSearchText =
  buildArchitectureObjectSearchText;

window.searchArchitectureObjects =
  searchArchitectureObjects;

window.searchArchitectureObjectsByType =
  searchArchitectureObjectsByType;

window.searchArchitectureObjectsByLayer =
  searchArchitectureObjectsByLayer;